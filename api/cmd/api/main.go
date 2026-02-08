package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"afterzin/api/internal/config"
	"afterzin/api/internal/db"
	"afterzin/api/internal/graphql"
	"afterzin/api/internal/middleware"
	"afterzin/api/internal/stripe"
)

func main() {
	cfg := config.Load()

	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0755); err != nil {
		log.Fatalf("create data dir: %v", err)
	}

	sqlite, err := db.OpenSQLite(cfg.DBPath)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer sqlite.Close()

	if err := db.Migrate(sqlite); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	graphqlHandler := graphql.NewHandler(sqlite, cfg)

	// Build HTTP mux with all routes
	mux := http.NewServeMux()
	mux.Handle("/graphql", graphqlHandler)

	// Stripe REST endpoints (only registered when STRIPE_SECRET_KEY is set)
	if cfg.StripeSecretKey != "" {
		stripeClient := stripe.NewClient(
			cfg.StripeSecretKey,
			cfg.StripeWebhookSecret,
			cfg.StripeAppFee,
			cfg.BaseURL,
		)
		stripeHandler := stripe.NewHandler(stripeClient, sqlite, cfg)
		mux.HandleFunc("/api/stripe/connect/create-account", stripeHandler.CreateAccount)
		mux.HandleFunc("/api/stripe/connect/onboarding-link", stripeHandler.CreateOnboardingLink)
		mux.HandleFunc("/api/stripe/connect/status", stripeHandler.GetStatus)
		mux.HandleFunc("/api/stripe/connect/pix-key", stripeHandler.UpdatePixKey)
		mux.HandleFunc("/api/stripe/checkout/create", stripeHandler.CreateCheckoutSession)
		mux.HandleFunc("/api/stripe/webhook", stripeHandler.HandleWebhook)
		log.Println("Stripe endpoints registered (Connect + Checkout + Webhook)")
	} else {
		log.Println("STRIPE_SECRET_KEY not set — Stripe endpoints disabled")
	}

	handler := middleware.CORS(cfg.CORSOrigins)(middleware.Auth(cfg.JWTSecret)(mux))

	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Port)
	httpServer := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Printf("GraphQL server listening on %s", addr)

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
	log.Println("server stopped")
}
