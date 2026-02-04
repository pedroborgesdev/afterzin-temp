package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port         int
	DBPath       string
	JWTSecret    string
	Playground   bool
	CORSOrigins  []string
}

func Load() *Config {
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			port = v
		}
	}
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/afterzin.db"
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-change-in-production"
	}
	playground := os.Getenv("PLAYGROUND") == "true" || os.Getenv("PLAYGROUND") == "1"
	corsOrigins := []string{
		"http://localhost:4040",
		"http://127.0.0.1:4040",
		"http://localhost:5173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:3000",
	}
	if o := os.Getenv("CORS_ORIGINS"); o != "" {
		// Comma-separated list, e.g. "http://localhost:5173,http://127.0.0.1:5173"
		parts := strings.Split(o, ",")
		corsOrigins = make([]string, 0, len(parts))
		for _, p := range parts {
			if s := strings.TrimSpace(p); s != "" {
				corsOrigins = append(corsOrigins, s)
			}
		}
		if len(corsOrigins) == 0 {
			corsOrigins = []string{"http://localhost:4040", "http://127.0.0.1:4040"}
		}
	}
	return &Config{
		Port:        port,
		DBPath:      dbPath,
		JWTSecret:   jwtSecret,
		Playground:  playground,
		CORSOrigins: corsOrigins,
	}
}
