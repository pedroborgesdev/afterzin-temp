package stripe

import (
	"fmt"
	"net/url"
	"strconv"
)

// ProductResult holds the IDs of a created Stripe product and its price.
type ProductResult struct {
	ProductID string
	PriceID   string
}

// CreateProductWithPrice creates a Stripe Product + Price on the PLATFORM account.
// Each ticket type becomes a product; the price is set in BRL centavos.
//
// Rationale: products live on the platform account (not the connected account)
// because the platform is the merchant of record and controls pricing.
func (c *Client) CreateProductWithPrice(name, description string, amountCentavos int64) (*ProductResult, error) {
	// Step 1: Create the product
	productParams := url.Values{}
	productParams.Set("name", name)
	if description != "" {
		productParams.Set("description", description)
	}

	productResp, err := c.v1Form("POST", "/products", productParams)
	if err != nil {
		return nil, fmt.Errorf("create product: %w", err)
	}

	productID, ok := productResp["id"].(string)
	if !ok || productID == "" {
		return nil, fmt.Errorf("no product id in response")
	}

	// Step 2: Create the price (one-time, BRL)
	priceParams := url.Values{}
	priceParams.Set("product", productID)
	priceParams.Set("unit_amount", strconv.FormatInt(amountCentavos, 10))
	priceParams.Set("currency", "brl")

	priceResp, err := c.v1Form("POST", "/prices", priceParams)
	if err != nil {
		return nil, fmt.Errorf("create price: %w", err)
	}

	priceID, ok := priceResp["id"].(string)
	if !ok || priceID == "" {
		return nil, fmt.Errorf("no price id in response")
	}

	return &ProductResult{
		ProductID: productID,
		PriceID:   priceID,
	}, nil
}
