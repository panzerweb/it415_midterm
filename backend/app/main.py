import hashlib
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel, create_engine, select

from .models import (
    MAX_AMOUNT, CheckoutRequest, Product, Receipt, ReceiptItem,
    Transaction, TransactionItem,
)

SEED_PRODUCTS = [
    (1, "Coffee", "Drinks", "coffee", 4500),
    (2, "Sandwich", "Food", "sandwich", 5000),
    (3, "Soft Drink", "Drinks", "soda", 3500),
    (4, "Cookies", "Snacks", "cookie", 2500),
    (5, "Bottled Water", "Drinks", "water", 2000),
    (6, "Chocolate", "Snacks", "chocolate", 2500),
]


def fingerprint(body: CheckoutRequest) -> str:
    payload = body.model_dump(mode="json", exclude={"request_id"})
    payload["items"] = sorted(payload["items"], key=lambda item: item["product_id"])
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def receipt_for(session: Session, transaction: Transaction) -> Receipt:
    items = session.exec(
        select(TransactionItem)
        .where(TransactionItem.transaction_id == transaction.id)
        .order_by(TransactionItem.id)
    ).all()
    return Receipt(
        reference=transaction.reference,
        created_at=transaction.created_at.replace(tzinfo=timezone.utc),
        payment_method=transaction.payment_method,
        total_centavos=transaction.total_centavos,
        amount_paid_centavos=transaction.amount_paid_centavos,
        change_centavos=transaction.change_centavos,
        items=[ReceiptItem(**item.model_dump()) for item in items],
    )


def existing_receipt(session: Session, request_id: str, digest: str) -> Receipt | None:
    transaction = session.exec(
        select(Transaction).where(Transaction.request_id == request_id)
    ).first()
    if transaction is None:
        return None
    if transaction.request_fingerprint != digest:
        raise HTTPException(409, "This payment request was already used for a different order.")
    return receipt_for(session, transaction)


def create_app(database_url: str | None = None) -> FastAPI:
    default_db = Path(__file__).resolve().parents[1] / "campus-store.db"
    url = database_url or os.getenv("DATABASE_URL", f"sqlite:///{default_db.as_posix()}")
    engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 15})

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            for product_id, name, category, icon, price in SEED_PRODUCTS:
                if session.get(Product, product_id) is None:
                    session.add(Product(id=product_id, name=name, category=category,
                                        icon=icon, price_centavos=price))
            session.commit()
        yield
        engine.dispose()

    app = FastAPI(title="Campus Store Kiosk API", version="1.0.0", lifespan=lifespan)
    app.state.engine = engine

    @app.get("/api/products", response_model=list[Product])
    def products():
        with Session(engine) as session:
            return session.exec(select(Product).order_by(Product.id)).all()

    @app.get("/api/transactions/{reference}", response_model=Receipt)
    def get_transaction(reference: str):
        with Session(engine) as session:
            transaction = session.exec(
                select(Transaction).where(Transaction.reference == reference)
            ).first()
            if transaction is None:
                raise HTTPException(404, "Receipt not found.")
            return receipt_for(session, transaction)

    @app.post("/api/checkout", response_model=Receipt)
    def checkout(body: CheckoutRequest):
        request_id, digest = str(body.request_id), fingerprint(body)
        with Session(engine) as session:
            previous = existing_receipt(session, request_id, digest)
            if previous is not None:
                return previous

            product_ids = [item.product_id for item in body.items]
            if len(set(product_ids)) != len(product_ids):
                raise HTTPException(422, "Each product must appear only once in an order.")
            lines = []
            for item in body.items:
                product = session.get(Product, item.product_id)
                if product is None:
                    raise HTTPException(422, "A selected product is unavailable. Please review your order.")
                if product.price_centavos <= 0:
                    raise HTTPException(422, "A selected product has an invalid price.")
                lines.append(dict(product_id=product.id, name=product.name,
                                  quantity=item.quantity, unit_price_centavos=product.price_centavos,
                                  subtotal_centavos=product.price_centavos * item.quantity))
            total = sum(line["subtotal_centavos"] for line in lines)
            if total > MAX_AMOUNT:
                raise HTTPException(422, "This order exceeds the kiosk transaction limit.")
            if body.payment_method == "cash":
                paid = body.amount_paid_centavos
                if paid is None:
                    raise HTTPException(422, "Enter the cash amount paid.")
                if paid < total:
                    raise HTTPException(422, f"Insufficient payment. Please enter at least ₱{total / 100:,.2f}.")
            else:
                if body.amount_paid_centavos is not None:
                    raise HTTPException(422, "QR and card payments calculate the paid amount automatically.")
                paid = total

            now = datetime.now(timezone.utc)
            transaction = Transaction(
                reference=f"TXN-{now.year}-{uuid4().hex[:12].upper()}",
                request_id=request_id, request_fingerprint=digest, created_at=now,
                payment_method=body.payment_method, total_centavos=total,
                amount_paid_centavos=paid, change_centavos=paid - total,
            )
            session.add(transaction)
            try:
                session.flush()
                for line in lines:
                    session.add(TransactionItem(transaction_id=transaction.id, **line))
                session.commit()
            except IntegrityError:
                # A concurrent retry may have completed this same request first.
                session.rollback()
                previous = existing_receipt(session, request_id, digest)
                if previous is not None:
                    return previous
                raise HTTPException(503, "Payment could not be saved. Please retry this payment.")
            session.refresh(transaction)
            return receipt_for(session, transaction)

    return app


app = create_app()

