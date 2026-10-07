from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.main import create_app
from app.models import Product, Transaction, TransactionItem


@pytest.fixture
def client(tmp_path):
    app = create_app(f"sqlite:///{(tmp_path / 'test.db').as_posix()}")
    with TestClient(app) as client:
        yield client


def order(**overrides):
    return {
        "request_id": str(uuid4()),
        "items": [{"product_id": 1, "quantity": 2}, {"product_id": 2, "quantity": 1},
                  {"product_id": 3, "quantity": 1}],
        "payment_method": "cash", "amount_paid_centavos": 20000, **overrides,
    }


def test_products_and_cash_receipt(client):
    products = client.get("/api/products").json()
    assert len(products) == 6
    assert [p["price_centavos"] for p in products] == [4500, 5000, 3500, 2500, 2000, 2500]
    response = client.post("/api/checkout", json=order())
    assert response.status_code == 200
    receipt = response.json()
    assert (receipt["total_centavos"], receipt["amount_paid_centavos"], receipt["change_centavos"]) == (17500, 20000, 2500)
    assert [i["subtotal_centavos"] for i in receipt["items"]] == [9000, 5000, 3500]
    assert receipt["status"] == "completed"
    assert receipt["created_at"].endswith("Z")
    assert client.get(f"/api/transactions/{receipt['reference']}").json() == receipt


@pytest.mark.parametrize("method", ["qr", "card", "cash"])
def test_exact_payment(client, method):
    payload = order(payment_method=method, amount_paid_centavos=17500 if method == "cash" else None)
    result = client.post("/api/checkout", json=payload)
    assert result.status_code == 200
    assert result.json()["payment_method"] == method
    assert result.json()["amount_paid_centavos"] == 17500
    assert result.json()["change_centavos"] == 0


@pytest.mark.parametrize("patch", [
    {"amount_paid_centavos": 10000}, {"amount_paid_centavos": None},
    {"amount_paid_centavos": -1}, {"amount_paid_centavos": ""},
    {"amount_paid_centavos": "abc"}, {"amount_paid_centavos": 17500.5},
    {"amount_paid_centavos": True}, {"items": []},
    {"items": [{"product_id": 999, "quantity": 1}]},
    {"items": [{"product_id": 1, "quantity": 0}]},
    {"items": [{"product_id": 1, "quantity": -1}]},
    {"items": [{"product_id": 1, "quantity": 1.5}]},
    {"items": [{"product_id": 1, "quantity": 100}]},
    {"items": [{"product_id": 1, "quantity": True}]},
    {"items": [{"product_id": 1, "quantity": 1}, {"product_id": 1, "quantity": 1}]},
    {"payment_method": "other"}, {"payment_method": "qr", "amount_paid_centavos": 17500},
    {"total_centavos": 1}, {"request_id": "invalid"},
])
def test_invalid_checkout_has_no_side_effects(client, patch):
    assert client.post("/api/checkout", json=order(**patch)).status_code == 422
    with Session(client.app.state.engine) as session:
        assert session.exec(select(Transaction)).all() == []
        assert session.exec(select(TransactionItem)).all() == []


def test_idempotency_and_unique_references(client):
    payload = order()
    first = client.post("/api/checkout", json=payload).json()
    assert client.post("/api/checkout", json=payload).json() == first
    reordered = {**payload, "items": list(reversed(payload["items"]))}
    assert client.post("/api/checkout", json=reordered).json() == first
    assert client.post("/api/checkout", json={**payload, "amount_paid_centavos": 30000}).status_code == 409
    assert client.post("/api/checkout", json=order()).json()["reference"] != first["reference"]
    with Session(client.app.state.engine) as session:
        assert len(session.exec(select(Transaction)).all()) == 2


def test_concurrent_retry(client):
    payload = order()
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: client.post("/api/checkout", json=payload), range(2)))
    assert all(r.status_code == 200 for r in responses)
    assert responses[0].json() == responses[1].json()
    with Session(client.app.state.engine) as session:
        assert len(session.exec(select(Transaction)).all()) == 1


def test_price_authority_snapshot_and_restart(tmp_path):
    url = f"sqlite:///{(tmp_path / 'persistent.db').as_posix()}"
    with TestClient(create_app(url)) as client:
        with Session(client.app.state.engine) as session:
            coffee = session.get(Product, 1)
            coffee.price_centavos = 4550
            session.add(coffee)
            session.commit()
        receipt = client.post("/api/checkout", json=order()).json()
        assert receipt["total_centavos"] == 17600
        with Session(client.app.state.engine) as session:
            coffee = session.get(Product, 1)
            coffee.price_centavos = 6000
            coffee.name = "Updated coffee"
            session.add(coffee)
            session.commit()
    with TestClient(create_app(url)) as restarted:
        assert restarted.get(f"/api/transactions/{receipt['reference']}").json() == receipt
        assert restarted.get("/api/products").json()[0]["price_centavos"] == 6000
        assert restarted.get("/api/transactions/missing").status_code == 404

