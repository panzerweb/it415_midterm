from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as SchemaField, StrictInt
from sqlmodel import Field, SQLModel

PaymentMethod = Literal["cash", "qr", "card"]
MAX_AMOUNT = 100_000_000  # centavos; keeps unreasonable inputs out of a kiosk sale


class Product(SQLModel, table=True):
    id: int = Field(primary_key=True)
    name: str
    category: str
    icon: str
    price_centavos: int


class Transaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    reference: str = Field(unique=True, index=True)
    request_id: str = Field(unique=True, index=True)
    request_fingerprint: str
    created_at: datetime
    payment_method: str
    total_centavos: int
    amount_paid_centavos: int
    change_centavos: int


class TransactionItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    transaction_id: int = Field(foreign_key="transaction.id", index=True)
    product_id: int
    name: str
    quantity: int
    unit_price_centavos: int
    subtotal_centavos: int


class OrderItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    product_id: StrictInt = SchemaField(gt=0)
    quantity: StrictInt = SchemaField(ge=1, le=99)


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    items: list[OrderItem] = SchemaField(min_length=1, max_length=100)
    payment_method: PaymentMethod
    amount_paid_centavos: StrictInt | None = SchemaField(default=None, ge=0, le=MAX_AMOUNT)


class ReceiptItem(BaseModel):
    product_id: int
    name: str
    quantity: int
    unit_price_centavos: int
    subtotal_centavos: int


class Receipt(BaseModel):
    reference: str
    created_at: datetime
    payment_method: PaymentMethod
    total_centavos: int
    amount_paid_centavos: int
    change_centavos: int
    status: Literal["completed"] = "completed"
    items: list[ReceiptItem]

