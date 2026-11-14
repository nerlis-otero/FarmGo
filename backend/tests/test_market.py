from app.services.market_service import (
    get_market_metrics
)

corn = get_market_metrics(
    crop_name="corn",
    price_file="nass_corn_tx_price.csv",
    yield_file="nass_corn_tx_yield.csv",
)

print(corn)