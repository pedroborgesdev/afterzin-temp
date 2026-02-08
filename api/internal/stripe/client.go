// Package stripe provides a unified Stripe API client.
// Uses V2 JSON API for Connect accounts and V1 form-encoded API for
// Products, Prices, and Checkout Sessions. No external SDK dependency.
package stripe

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// Client wraps all Stripe API interactions.
type Client struct {
	SecretKey      string
	WebhookSecret  string
	ApplicationFee int64  // centavos per ticket (default 500 = R$5.00)
	BaseURL        string // platform frontend URL for redirects
	httpClient     *http.Client
}

// NewClient creates a Stripe client. Panics if secretKey is empty.
func NewClient(secretKey, webhookSecret string, applicationFee int64, baseURL string) *Client {
	if secretKey == "" {
		panic("STRIPE_SECRET_KEY environment variable is required")
	}
	if applicationFee <= 0 {
		applicationFee = 500
	}
	return &Client{
		SecretKey:      secretKey,
		WebhookSecret:  webhookSecret,
		ApplicationFee: applicationFee,
		BaseURL:        strings.TrimRight(baseURL, "/"),
		httpClient:     &http.Client{},
	}
}

// v2JSON makes a JSON-body request to the Stripe V2 API.
func (c *Client) v2JSON(method, path string, body interface{}) (map[string]interface{}, error) {
	apiURL := "https://api.stripe.com" + path

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, apiURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.SecretKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Stripe-Version", "2026-01-28.clover")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("stripe v2 error (%d): %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}
	return result, nil
}

// v1Form makes a form-encoded request to the Stripe V1 API.
func (c *Client) v1Form(method, path string, params url.Values) (map[string]interface{}, error) {
	apiURL := "https://api.stripe.com/v1" + path

	var reqBody io.Reader
	if params != nil {
		reqBody = strings.NewReader(params.Encode())
	}

	req, err := http.NewRequest(method, apiURL, reqBody)
	if err != nil {
		return nil, fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.SecretKey)
	if params != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http do: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("stripe v1 error (%d): %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}
	return result, nil
}
