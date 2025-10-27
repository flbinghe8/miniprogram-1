// pages/guide/guide.js
Page({
  data: {
    // 教程内容列表 (用于 WXML 循环展示)
    guideSections: [
      {
        title: "第一步：选择工作流",
        content: "在「首页」选择您需要的AI工作流，例如「专家级Listing」或「标题五点描述撰写」。"
      },
      {
        title: "第二步：填写关键信息",
        content: "根据要求输入产品名称、核心卖点、目标用户等信息。信息越详细，AI生成的报告越精准。"
      },
      {
        title: "第三步：查看和复制",
        content: "等待AI生成报告。完成后，您可以在结果页查看报告全文，并一键复制使用，或点击「重新编辑」修改输入。"
      }
    ],
    // 添加到桌面的提示
    desktopTip: "将小程序添加到手机桌面，下次使用更快捷！"
  },
  
  onLoad: function (options) {
  }
})