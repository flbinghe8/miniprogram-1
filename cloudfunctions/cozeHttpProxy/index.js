// cloudfunctions/cozeHttpProxy/index.js
const fetch = require('node-fetch');

exports.main = async (event) => {
  const { url, method, headers, data } = event;
  
  console.log('🔗 cozeHttpProxy 被调用');
  console.log('📤 请求信息:', { url, method });
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: method === 'POST' ? JSON.stringify(data) : undefined
    });
    
    const result = await response.json();
    console.log('✅ cozeHttpProxy 成功');
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('❌ cozeHttpProxy 失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};