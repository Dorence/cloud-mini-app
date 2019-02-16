// miniprogram/pages/serviceHall/serviceHall.js
wx.cloud.init();
const db = wx.cloud.database();
const app = getApp();

Page({
  data: {
    avatarUrl: "../../assets/user-unlogin.png",
    exam: [{
      num: null,
      text: "未审批"
    }, {
      num: null,
      text: "撤回"
    }, {
      num: null,
      text: "未通过"
    }, {
      num: null,
      text: "已通过"
    }]
  },
  onLoad: function () {
    this.checkLogin();
    // 获取用户信息
    this.getUserInfo();
    // 获取各状态的数量
    if (this.isUserAdmin()) {
      this.updateNumber();
    }
  },
  /** 下拉动作刷新 */
  onPullDownRefresh: function () {
    this.updateNumber().then(() => { wx.stopPullDownRefresh(); });
  },
  /** 点击登录按钮 */
  userLogin: function () {
    if (app.loginState.isLogin === false) {
      wx.login({
        success: this.getUserInfo
      });
      this.callCloudLogin(true);
    }
  },
  /** 检查是否有授权并获取 userInfo */
  getUserInfo: function () {
    const that = this;
    wx.getSetting({
      success(res) {
        if (res.authSetting["scope.userInfo"]) {
          // 已授权,可以直接调用 getUserInfo
          wx.getUserInfo({
            success(r) {
              that.setData(r.userInfo);
            }
          })
        }
        else {
          console.log("No auth to scope.userInfo");
        }
      }
    });
  },
  /** 链接至教室申请/进度查询 */
  navToBorrow: function (e) {
    // console.log(e);
    const data = e.currentTarget.dataset;
    if (this.data.isLogin) {
      console.log("navigateTo", data.url);
      wx.navigateTo(data);
    } else {
      wx.showToast({
        title: "请先登录",
        icon: "none",
        duration: 2000
      });
    }
  },
  /** 链接至 listApproval */
  navToApproval: function (e) {
    // console.log(e);
    const data = e.currentTarget.dataset;
    if (this.data.exam[data.flag].num) {
      console.log("navigateTo", data);
      wx.navigateTo({
        url: '../listApproval/listApproval?flag=' + data.flag
      });
    }
  },
  /** 更新符合条件的审批的数量 */
  updateNumber: function () {
    function updateSingle(flag, page) {
      return db.collection('forms').where({
        exam: flag
      }).count().then(res => {
        console.log(flag + " : " + res.total);
        page.setData({
          ["exam[" + flag + "].num"]: res.total
        });
      });
    }
    let arr = [];
    for (let i = 0; i < this.data.exam.length; i++)
      arr.push(updateSingle(i, this));
    return Promise.all(arr);
  },
  /** 检查用户登录状态 */
  checkLogin: function () {
    const that = this;
    wx.checkSession({
      success: (res) => {
        // session_key 未过期，并且在本生命周期一直有效
        console.log("[checkSession] Has session.");
        that.callCloudLogin(false);
      },
      fail: () => {
        console.log("[checkSession] User isn't logged in.");
        that.updateUserInfo({
          isLogin: false
        });
      }
    });
  },
  /** 更新全局变量 app.loginState */
  updateUserInfo: function (obj) {
    app.loginState = obj;
    this.setData(obj);
  },
  isUserAdmin: function () {
    if (app.loginState && typeof app.loginState === "object")
      return app.loginState.isLogin && app.loginState.isAdmin;
    else
      return false;
  },
  /** 调用云函数登录并修改页面状态 */
  callCloudLogin: function (isShowToast) {
    const that = this;
    wx.cloud.callFunction({
      name: "login",
      data: {}
    }).then((res) => {
      console.log("[login] call success", res.result);
      if (isShowToast)
        wx.showToast({
          title: "登录成功",
          icon: "success"
        });
      let R = res.result;
      R.isLogin = true;
      that.updateUserInfo(R);
      that.getUserInfo();
      // 如果是管理员,获取各状态的数量
      if (that.isUserAdmin()) {
        that.updateNumber();
      }
    }).catch((err) => {
      console.error("[login] call failed", err);
      if (isShowToast)
        wx.showToast({
          title: "登录失败",
          icon: 'none',
          duration: 2000
        });
      that.updateUserInfo({
        isLogin: false
      });
    });
  }
})