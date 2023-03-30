// 金十数据-快讯1
const express = require('express');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const sleep = require('../util/sleep');
const router = express.Router();
const { db } = require('../config/db');
router.get('/categories1', async (req, res) => {
    //更新定时任务
    timedtasksFun();
    res.send({
        status: "OK"
    })
})

/**
 * 定时任务
 */
const timedtasksFun = () => {
    let sql = `select * from timedtasks where title = '金十数据-快讯1'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("categories1")
            if (result[0].isOpen == 'true') {
                schedule.scheduleJob("categories1", result[0].seconds, async () => {
                    console.log('金十数据-快讯1--categories1:' + new Date());
                    // 启动浏览器
                    const browser = await puppeteer.launch({
                        headless: true,//默认是无头模式,这里为了示范所以使用正常模式
                    });
                    // 控制浏览器打开新标签页面
                    const page = await browser.newPage();
                    // 在新标签中打开要爬取的网页
                    await page.goto('https://www.jin10.com/');
                    // 设置页面的宽高
                    await page.setViewport({
                        width: 1440,
                        height: 810,
                        deviceScaleFactor: 1
                    })
                    // 点开分类列表
                    await moreClick(page);

                    // 获取列表的行数和列数
                    let list = await page.$$('.inner>.inner-container>.scroll-view-container>.classify-panel-bd-item');
                    let listClick = [];
                    for (let i = 0; i < list.length; i++) {
                        let tempTypeList = await list[i].$$('dl>dd>span');
                        listClick.push(tempTypeList);
                    }

                    /**
                     * 每次点击都要重新获取
                     * @param {number} x 行
                     * @param {number} y 列
                     */
                    async function listClickFun(x, y, page, db) {
                        let tempList = await page.$$('.inner>.inner-container>.scroll-view-container>.classify-panel-bd-item');
                        // 为了点击页面存储的元素
                        let tempListClick = [];
                        for (let i = 0; i < tempList.length; i++) {
                            let tempTypeList = await tempList[i].$$('dl>dd>span');
                            tempListClick.push(tempTypeList);
                        }
                        // console.log(x + 1, y + 1);
                        // 分类标题
                        let tempClassification = await page.$eval(`.inner>.inner-container>.scroll-view-container>.classify-panel-bd-item:nth-of-type(${x + 1})>dl>dt>span`, el => el.innerText);
                        // 子分类标题
                        let tempSubclassification = await page.$eval(`.inner>.inner-container>.scroll-view-container>.classify-panel-bd-item:nth-of-type(${x + 1})>dl>dd:nth-of-type(${y + 1})>span`, el => el.innerText);
                        // console.log(tempClassification, tempSubclassification);

                        await tempListClick[x][y].click();
                        await sleep(getRandom(100, 3000));

                        // 在这里面获取数据(获取每个分类下面的列表数据)
                        for (let j = 0; j < 10; j++) {
                            // 点击五下加载更多
                            await loadMoreClick(page);
                        }
                        let data = await page.evaluate((classification, subclassification) => {
                            let res = [];
                            let contentList = document.querySelectorAll('#jin_flash_list>.jin-flash-item-container.is-normal');
                            let tempDate = "";
                            for (let i = 0; i < contentList.length; i++) {
                                let tempTime = contentList[i].querySelector('.jin-flash-date-line>.date-box>span')
                                    ? contentList[i].querySelector('.jin-flash-date-line>.date-box>span').textContent.trim() : null;
                                if (!!tempTime) {
                                    tempDate = `${new Date().getFullYear()}年${tempTime}`;
                                };

                                // 时间可当作id使用
                                let time = `${tempDate} ${contentList[i].querySelector('.jin-flash-item.flash>.item-time') ?
                                    contentList[i].querySelector('.jin-flash-item.flash>.item-time').textContent : ""}-${classification}-${subclassification}`;
                                // 标题
                                let title = contentList[i].querySelector('.jin-flash-item.flash>.item-right>.right-top>.right-common>.right-common-title') ?
                                    contentList[i].querySelector('.jin-flash-item.flash>.item-right>.right-top>.right-common>.right-common-title').textContent : "";
                                //内容
                                let context = contentList[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-content>div>div>div>div') ?
                                    contentList[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-content>div>div>div>div').innerText : "";
                                //图片(只有一行文本时的图片 例如:金十图示：2023年02月02日（周四）全球汽车制造商市值变化(金十数据APP))
                                let img = contentList[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-pic.img-intercept.flash-pic>div>img') ?
                                    contentList[i].querySelector('.jin-flash-item.flash>.item-right.is-common>.right-top>.right-pic.img-intercept.flash-pic>div>img').getAttribute("data-src") : "";

                                res.push({
                                    //分类标题
                                    classification,
                                    //分类子标题
                                    subclassification,
                                    time,
                                    title,
                                    context,
                                    img
                                });
                            }
                            return res;
                        }, tempClassification, tempSubclassification);
                        // 数据需要在这插入数据库
                        for (let i = 0; i < data.length; i++) {
                            let selectSql = `select * from newsclassification where time='${data[i].time}'`;
                            db.query(selectSql, (err, data) => {
                                if (err) {
                                    console.log("出错了!", err);
                                } else {
                                    // console.log("成功了!", data.length);
                                    data.length < 1 && addData(i);
                                }
                            })
                        }
                        // 添加数据
                        function addData(i) {
                            let sql = `insert into newsclassification(time,classification,subclassification,title,context,img) 
            values('${data[i].time}','${data[i].classification}','${data[i].subclassification}','${data[i].title}','${data[i].context}','${data[i].img}')`;
                            db.query(sql, (err, result) => {
                                if (err) {
                                    console.log("插入失败!", err);
                                } else {
                                    console.log("插入成功!");
                                }
                            })
                        }
                        return data;
                    }
                    // 依次点击分类列表
                    for (let i = 0; i < listClick.length; i++) {
                        for (let j = 0; j < listClick[i].length; j++) {
                            if (i >= 3 && i < 6) {
                                let data = await listClickFun(i, j, page, db);
                                // console.log(i, j, data.length);
                                // console.log(data);
                                // 如果点击到了最后一行的最后一列就不要再点击了
                                (i != listClick.length - 1 && j != listClick[listClick.length - 1].length - 1) && await moreClick(page);
                            }

                        }
                    }
                    // 关闭浏览器
                    await browser.close();
                });
            }
        }
    })
}
timedtasksFun();

module.exports = router;