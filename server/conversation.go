package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

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

func handleConversations(c *gin.Context) {
	c.JSON(http.StatusOK, fakeConversations)
}
