package main

import (
	"log"
	"net"
	"sort"
)

func printAccessURLs(host string, port string) {
	log.Printf("server listening on %s", net.JoinHostPort(host, port))
	log.Printf("version endpoint: http://localhost:%s/v", port)
	log.Printf("conversation endpoint: http://localhost:%s/conversation", port)
	log.Printf("websocket endpoint: ws://localhost:%s/ws", port)
	log.Printf("chat room endpoint: ws://localhost:%s/chat_room", port)
	log.Printf("auth sms endpoint: http://localhost:%s/auth/sms", port)
	log.Printf("auth login endpoint: http://localhost:%s/auth/login", port)
	log.Printf("user profile endpoint: http://localhost:%s/user/profile", port)

	for _, ip := range localIPv4s() {
		log.Printf("version endpoint: http://%s:%s/v", ip, port)
		log.Printf("conversation endpoint: http://%s:%s/conversation", ip, port)
		log.Printf("websocket endpoint: ws://%s:%s/ws", ip, port)
		log.Printf("chat room endpoint: ws://%s:%s/chat_room", ip, port)
		log.Printf("auth sms endpoint: http://%s:%s/auth/sms", ip, port)
		log.Printf("auth login endpoint: http://%s:%s/auth/login", ip, port)
		log.Printf("user profile endpoint: http://%s:%s/user/profile", ip, port)
	}
}

func localIPv4s() []string {
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Printf("failed to list network interfaces: %v", err)
		return nil
	}

	var ips []string
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ip := ipFromAddr(addr)
			if ip == nil || ip.IsLoopback() {
				continue
			}

			ipv4 := ip.To4()
			if ipv4 == nil {
				continue
			}

			ips = append(ips, ipv4.String())
		}
	}

	sort.Strings(ips)
	return ips
}

func ipFromAddr(addr net.Addr) net.IP {
	switch value := addr.(type) {
	case *net.IPNet:
		return value.IP
	case *net.IPAddr:
		return value.IP
	default:
		return nil
	}
}
