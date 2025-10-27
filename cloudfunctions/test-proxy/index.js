exports.main = async (event, context) => {
    console.log('测试云函数被调用', event);
    
    return {
      success: true,
      message: '测试云函数调用成功！',
      receivedData: event,
      timestamp: new Date().toISOString()
    };
  };