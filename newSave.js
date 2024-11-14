// ==UserScript==
// @name         res
// @namespace    http://markVIP.taozhiyu.github.io/
// @version      0.1
// @description  VIP for maxiang
// @author       张峰
// @match        https://25825.sh.absoloop.com/*
// @icon         http://maxiang.io/favicon.ico
// @require      https://greasyfork.org/scripts/455943-ajaxhooker/code/ajaxHooker.js?version=1124435
// @grant        none
// @license      WTFPL
// @downloadURL https://update.greasyfork.org/scripts/476072/markVIP.user.js
// @updateURL https://update.greasyfork.org/scripts/476072/markVIP.meta.js
// ==/UserScript==

(function() {
    'use strict';
    console.log('脚本触发');
    // 初始化登录状态
    let isLoggedIn = false;

    // 创建并显示登录界面
    function showLoginPrompt() {
        console.log('执行登陆');
        const loginDiv = document.createElement('div');
        loginDiv.style.position = 'fixed';
        loginDiv.style.top = '50%';
        loginDiv.style.left = '50%';
        loginDiv.style.width = '300px';
        loginDiv.style.height = '400px';
        loginDiv.style.display = 'flex';
        loginDiv.style.justifyContent = 'center';
        loginDiv.style.alignItems = 'center';
        loginDiv.style.transform = 'translate(-50%, -50%)';
        loginDiv.style.backgroundColor = 'white';
        loginDiv.style.padding = '20px';
        loginDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        loginDiv.style.zIndex = 1000;

        const form = document.createElement('form');
        form.onsubmit = handleLogin;

        const usernameLabel = document.createElement('label');
        usernameLabel.textContent = 'Username: ';
        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.name = 'username';
        usernameInput.required = true;

        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password: ';
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.name = 'password';
        passwordInput.required = true;

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = 'Login';

        form.appendChild(usernameLabel);
        form.appendChild(usernameInput);
        form.appendChild(document.createElement('br'));
        form.appendChild(passwordLabel);
        form.appendChild(passwordInput);
        form.appendChild(document.createElement('br'));
        form.appendChild(submitButton);

        loginDiv.appendChild(form);
        document.body.appendChild(loginDiv);
    }
    setTimeout(function() {
        let loginStatus = localStorage.getItem('userData')
        if(!loginStatus){

            showLoginPrompt();}
    }, 1000);

    // 处理登录逻辑
    function handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const username = form.username.value;
        const password = form.password.value;

        // 这里应该是验证用户凭据的逻辑
        // 例如，通过 AJAX 请求发送到服务器进行验证
        // 由于这是一个示例，我们直接假设用户名是 "admin" 且密码是 "password"
        if (username === 'admin' && password === 'password') {
            isLoggedIn = true;
            document.body.removeChild(form.parentElement); // 移除登录界面
            localStorage.setItem('userData',isLoggedIn)
            startAjaxHooking(); // 启动 AJAX 拦截
        } else {
            alert('Invalid username or password');
        }
    }

    /* global ajaxHooker*/
    function startAjaxHooking() {
        if (isLoggedIn) {
            let lastProcessedMsgId = null;
            ajaxHooker.hook(request => {
                if (request.url.includes('/Visitors') && !request.url.includes('/Messages')) {
                    request.response = res => {
                        const json = JSON.parse(res.responseText);
                        console.log('lastChatMessage', json.lastChatMessage, res);
                        if (json && json[0].lastChatMessage) {
                            console.log('lastChatMessage', json[0], json[0].lastChatMessage);
                            let currentMsgId = json[0].lastChatMessage.msgId;
                            if (currentMsgId !== lastProcessedMsgId) {
                                lastProcessedMsgId = currentMsgId;
                                localStorage.setItem('currentMsgId', currentMsgId);

                                // 使用解析出的数据建立 WebSocket 连接
                                const wsUrl = 'wss://bot-api-ts.billionconnect.net/chat_completion';
                                const socket = new WebSocket(wsUrl);
                                socket.onopen = function(event) {
                                    console.log('WebSocket is open now.', json[0]);
                                    socket.send(`{"q":"${json[0].lastChatMessage.body.bodies[0].msg}","user_id":"123","bot":"mall_h5","stream":true,"source":"default","new_thread": false}`);
                                };

                                socket.onmessage = function(event) {
                                    let parseData = JSON.parse(event.data);
                                    if (parseData.finish && currentMsgId) {
                                        injectDivBelowTarget(parseData.msg.content, currentMsgId);
                                        console.log('WebSocket message received:消息为', parseData, document);
                                    }
                                };

                                socket.onclose = function(event) {
                                    console.log('WebSocket is closed now.');
                                };

                                socket.onerror = function(error) {
                                    console.error('WebSocket error observed:', error);
                                };
                            } else {
                                console.error('报错了');
                            }
                        }
                    };
                }
            });
        }
    }




    // 注入消息到页面中的函数（保持不变）
    function injectDivBelowTarget(msg, id) {
        const allPs = document.querySelectorAll('p');
        let targetElement = null;
        for (let p of allPs) {
            if (p.textContent.trim() === id) {
                targetElement = p;
                break; // 找到后退出循环
            }
        }

        // 检查是否找到了目标元素
        if (!targetElement) {
            console.warn('未找到内容为 id 的 p 元素');
            return; // 若未找到，则不执行后续操作
        }
        const targetElementParent = targetElement.parentElement;
        if (!targetElementParent) {
            console.warn('目标 p 元素的父元素不存在');
            return; // 若父元素不存在，则不执行后续操作
        }
        // 创建一个新的 div 元素
        const newDiv = document.createElement('div');
        newDiv.textContent = msg;

        // 设置新 div 的样式（可选）
        newDiv.style.marginTop = '20px'; // 根据需要添加上边距
        newDiv.style.backgroundColor = '#999999';
        newDiv.style.display = 'block';
        newDiv.style.maxWidth = '90%';
        // 可以添加更多样式...

        // 将新 div 插入到目标元素的下一个兄弟节点位置
        // 使用 insertAdjacentElement 方法，'afterend' 表示插入到目标元素之后
        targetElementParent.insertAdjacentElement('afterend', newDiv);
    }
})();