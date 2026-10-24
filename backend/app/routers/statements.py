from fastapi import APIRouter, Depends, HTTPException, UploadFile

from ..auth import get_current_user
from ..services.statements import detect_recurring, parse_transactions

router = APIRouter(prefix="/api/statements", tags=["statements"], dependencies=[Depends(get_current_user)])

MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/detect")
async def detect(file: UploadFile):
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "File too large (max 5 MB)")
    text = data.decode("utf-8", errors="replace")
    txns = parse_transactions(text)
    if not txns:
        raise HTTPException(422, "No transactions found — expected 'MM/DD/YYYY  description  amount' lines or CSV")
    return {
        "transactions": len(txns),
        "span": [min(t["date"] for t in txns).isoformat(), max(t["date"] for t in txns).isoformat()],
        "suggestions": detect_recurring(txns),
    }
