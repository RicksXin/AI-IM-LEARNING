package flashauth

import (
	"net"
	"time"

	"github.com/go-sql-driver/mysql"
)

type DatabaseConfig struct {
	DSN      string
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

func (config DatabaseConfig) Enabled() bool {
	return config.DSN != "" || config.Name != ""
}

func (config DatabaseConfig) DSNText() string {
	if config.DSN != "" {
		return config.DSN
	}

	mysqlConfig := mysql.NewConfig()
	mysqlConfig.User = config.User
	mysqlConfig.Passwd = config.Password
	mysqlConfig.Net = "tcp"
	mysqlConfig.Addr = net.JoinHostPort(config.Host, config.Port)
	mysqlConfig.DBName = config.Name
	mysqlConfig.ParseTime = true
	mysqlConfig.Loc = time.Local
	mysqlConfig.Collation = "utf8mb4_unicode_ci"
	mysqlConfig.Params = map[string]string{
		"charset": "utf8mb4",
	}

	return mysqlConfig.FormatDSN()
}

func (config DatabaseConfig) AdminDSNText() string {
	mysqlConfig := mysql.NewConfig()
	mysqlConfig.User = config.User
	mysqlConfig.Passwd = config.Password
	mysqlConfig.Net = "tcp"
	mysqlConfig.Addr = net.JoinHostPort(config.Host, config.Port)
	mysqlConfig.ParseTime = true
	mysqlConfig.Loc = time.Local
	mysqlConfig.Collation = "utf8mb4_unicode_ci"
	mysqlConfig.Params = map[string]string{
		"charset": "utf8mb4",
	}

	return mysqlConfig.FormatDSN()
}
