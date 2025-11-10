// createPayment/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios')
const crypto = require('crypto')
const { parseString } = require('xml2js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const CONFIG = {
  appid: 'wx1e14111178d271d8',
  mch_id: '1730566892',
  key: 'Wx2026PhyK1h1g34567890AbcdEfGhus',
  notify_url: 'https://www.weixin.qq.com'
}

function signMd5(params, key) {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + '&key=' + key
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
}

function toXml(obj) {
  return '<xml>' + Object.keys(obj).map(k => `<${k}><![CDATA[${obj[k]}]]></${k}>`).join('') + '</xml>'
}

// ✅ 使用 xml2js 正确解析XML
function parseXml(xml) {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false, ignoreAttrs: true }, (err, result) => {
      if (err) reject(err)
      else resolve(result.xml)
    })
  })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()

  console.log('wxContext.OPENID:', wxContext.OPENID)

  try {
    const packageType = event.packageType || 'basic'
    const outTradeNo = 'TS' + Date.now() + Math.random().toString(36).slice(2, 8)

    const pkgMap = {
      basic: { name: '基础包', price: 9.9, credits: 10, days: 30 },
      popular: { name: '热销包', price: 29, credits: 30, days: 60 },
      unlimited: { name: '无限包', price: 99, credits: 100, days: 90 }
    }
    const pkg = pkgMap[packageType]
    if (!pkg) throw new Error('无效套餐类型')

    const orderRes = await db.collection('orders').add({
      data: {
        _openid: wxContext.OPENID,
        outTradeNo,
        packageType,
        packageName: pkg.name,
        totalFee: pkg.price,
        credits: pkg.credits,
        validDays: pkg.days,
        status: 'pending',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    const orderReq = {
      appid: CONFIG.appid,
      mch_id: CONFIG.mch_id,
      nonce_str: Math.random().toString(36).slice(2),
      body: `${pkg.name}-途胜运营服务`,
      out_trade_no: outTradeNo,
      total_fee: Math.round(pkg.price * 100),
      spbill_create_ip: '127.0.0.1',
      notify_url: CONFIG.notify_url,
      trade_type: 'JSAPI',
      openid: wxContext.OPENID
    }
    orderReq.sign = signMd5(orderReq, CONFIG.key)

    console.log('发送的支付请求:', orderReq)

    const xmlRes = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', toXml(orderReq), {
      headers: { 'Content-Type': 'text/xml' },
      timeout: 10000
    })

    console.log('微信返回原始 XML:', xmlRes.data)

    // ✅ 使用正确的XML解析
    const resObj = await parseXml(xmlRes.data)
    console.log('解析后的响应对象:', resObj)

    // ✅ 直接检查 prepay_id
    if (resObj.prepay_id) {
      console.log('✅ 支付成功，prepay_id:', resObj.prepay_id)

      // ✅ 关键修复：添加 appId 到支付参数
      const payParams = {
        appId: CONFIG.appid,  // ✅ 添加这一行修复签名问题
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: Math.random().toString(36).slice(2),
        package: `prepay_id=${resObj.prepay_id}`,
        signType: 'MD5'
      }
      payParams.paySign = signMd5(payParams, CONFIG.key)

      console.log('✅ 返回支付参数（包含appId）:', payParams)
      
      return { 
        success: true, 
        data: { 
          ...payParams, 
          orderId: orderRes._id, 
          outTradeNo, 
          packageInfo: pkg 
        } 
      }
    } else {
      console.log('❌ 支付失败，完整响应:', resObj)
      throw new Error(resObj.err_code_des || resObj.return_msg || '支付失败')
    }
  } catch (e) {
    console.error('支付创建失败:', e)
    return { success: false, message: e.message }
  }
}