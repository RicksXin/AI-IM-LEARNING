package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"sort"

	"github.com/gin-gonic/gin"
)

const (
	appName    = "LearningAI IM Backend"
	appVersion = "0.1.0"
)

type VersionResponse struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type ConversationResponse struct {
	Title   string `json:"title"`
	LastMsg string `json:"lastMsg"`
	Time    string `json:"time"`
}

var fakeConversations = []ConversationResponse{
	{Title: "产品体验群", LastMsg: "今晚把登录流程再过一遍。", Time: "09:12"},
	{Title: "后端开发小组", LastMsg: "我刚把 /v 接口跑通了。", Time: "09:24"},
	{Title: "AI 助手讨论", LastMsg: "提示词模板可以再拆细一点。", Time: "09:37"},
	{Title: "Flutter 与 RN 对比", LastMsg: "移动端先按 React Native 推进。", Time: "10:02"},
	{Title: "IM 架构评审", LastMsg: "消息序列号必须服务端生成。", Time: "10:18"},
	{Title: "设计稿同步", LastMsg: "会话列表先用紧凑布局。", Time: "10:41"},
	{Title: "测试与验收", LastMsg: "明天补一下弱网场景。", Time: "11:05"},
	{Title: "运营通知", LastMsg: "欢迎语文案已经更新。", Time: "11:22"},
	{Title: "文件传输方案", LastMsg: "大文件走对象存储。", Time: "11:49"},
	{Title: "推送服务", LastMsg: "离线消息要区分 APNs 和 FCM。", Time: "12:10"},
	{Title: "数据库设计", LastMsg: "会话表和成员表先定下来。", Time: "12:34"},
	{Title: "WebSocket 网关", LastMsg: "心跳间隔先用 30 秒。", Time: "13:08"},
	{Title: "前端联调", LastMsg: "接口字段保持 camelCase。", Time: "13:26"},
	{Title: "安全策略", LastMsg: "设备 token 需要定期刷新。", Time: "14:01"},
	{Title: "日志与监控", LastMsg: "先加请求耗时和状态码。", Time: "14:33"},
	{Title: "版本发布", LastMsg: "0.1.0 先只放基础接口。", Time: "15:06"},
	{Title: "新人学习", LastMsg: "Gin 路由可以从 GET 开始。", Time: "15:40"},
	{Title: "本地环境", LastMsg: "端口被占用就换 PORT。", Time: "16:12"},
	{Title: "接口文档", LastMsg: "示例响应要保持最新。", Time: "16:47"},
	{Title: "每日复盘", LastMsg: "今天先把会话接口补齐。", Time: "17:20"},
}

func main() {
	host := getEnv("HOST", "0.0.0.0")
	port := getEnv("PORT", "8080")
	addr := net.JoinHostPort(host, port)

	router := setupRouter()
	printAccessURLs(host, port)

	if err := router.Run(addr); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func setupRouter() *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	router.GET("/v", handleVersion)
	router.GET("/conversation", handleConversations)

	return router
}

func handleVersion(c *gin.Context) {
	c.JSON(http.StatusOK, VersionResponse{
		Name:    appName,
		Version: appVersion,
	})
}

func handleConversations(c *gin.Context) {
	c.JSON(http.StatusOK, fakeConversations)
}

func printAccessURLs(host string, port string) {
	log.Printf("server listening on %s", net.JoinHostPort(host, port))
	log.Printf("version endpoint: http://localhost:%s/v", port)
	log.Printf("conversation endpoint: http://localhost:%s/conversation", port)

	for _, ip := range localIPv4s() {
		log.Printf("version endpoint: http://%s:%s/v", ip, port)
		log.Printf("conversation endpoint: http://%s:%s/conversation", ip, port)
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

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
