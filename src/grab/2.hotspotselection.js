// 腾讯-资讯
const express = require('express');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const sleep = require('../util/sleep');
const router = express.Router();
const { db } = require('../config/db');
router.get('/hotspotselection', async (req, res) => {
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
    let sql = `select * from timedtasks where title = '腾讯-资讯'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("hotspotselection")
            if (result[0].isOpen == 'true') {
                schedule.scheduleJob("hotspotselection", result[0].seconds, async () => {
                    console.log('腾讯-资讯--hotspotselection:' + new Date());
                    // 启动浏览器
                    const browser = await puppeteer.launch({
                        headless: false
                    });
                    // 控制浏览器打开新标签页面
                    const page = await browser.newPage();
                    // 在新标签页中打开要爬取得网页
                    await page.goto("https://news.qq.com/");
                    await page.setViewport({
                        width: 1440,
                        height: 810,
                        deviceScaleFactor: 1
                    });
                    // 按10下向下键,加载页面数据
                    for (let i = 0; i < 10; i++) {
                        await sleep(1000);
                        await page.keyboard.down('PageDown');
                    };
                    let data = await page.evaluate(() => {
                        let res = [];
                        let list = document.querySelectorAll(`#List>.channel_mod>ul[dt-params='card_name=热点推荐&dt_element_path=["em_content_card"]']`)[0].children;
                        for (let i = 0; i < list.length; i++) {
                            // 生成id的函数
                            function algorithm() {
                                let abc = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'g', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
                                let [max, min] = [Math.floor(Math.random() * (10 - 7 + 1) + 1), Math.floor(Math.random() * (17 - 10 + 1) + 17)];
                                abc = abc.sort(() => 0.4 - Math.random()).slice(max, min).slice(0, 8).join("");
                                var a = new Date().getTime() + abc;
                                return a
                            }
                            let id = algorithm();
                            // 图片
                            let imgDom = list[i].querySelector('.picture>.Monograph');
                            let img = imgDom ? imgDom.getAttribute('src') : '';
                            // 标题
                            let titleDom = list[i].querySelector('.detail>h3>a');
                            let title = titleDom ? titleDom.textContent.trim() : '';
                            let jumpLink = titleDom ? titleDom.getAttribute('href') : '';
                            // 来源
                            let sourceDom = list[i].querySelector('.detail>.binfo.cf>.fl>.source');
                            let source = sourceDom ? sourceDom.textContent.trim() : '';
                            let sourceHref = sourceDom ? sourceDom.getAttribute('href') : '';
                            res.push({
                                id,
                                img,
                                title,
                                jumpLink,
                                source,
                                sourceHref
                            });
                        }
                        return res;
                    });
                    for (let i = 0; i < data.length; i++) {
                        await sleep(5000);
                        let selectSql = `select * from hotspotselection where title = '${data[i].title}'`;
                        db.query(selectSql, (err, result) => {
                            if (err) {
                                console.log("查询出错");
                            } else {
                                result.length < 1 && addData(i);
                            }
                        })
                        // console.log(data[i]);
                    }
                    function addData(i) {
                        let sql = `insert into hotspotselection(id,time,img,title,jumpLink,source,sourceHref) 
        values('${data[i].id}','${moment().format("YYYY-MM-DD hh:mm:ss SSS")}','${data[i].img}','${data[i].title}','${data[i].jumpLink}','${data[i].source}','${data[i].sourceHref}')`;
                        db.query(sql, (err, result) => {
                            if (err) {
                                console.log("插入失败", err);
                            } else {
                                console.log("插入成功");
                            }
                        })
                        detailsPage(data[i].id, data[i].jumpLink, data[i].title);
                    }
                    /**
                     * 爬取详情页数据
                     * @param {*} id  id对应的外键
                     * @param {*} url 跳转的页面
                     */
                    async function detailsPage(id, url, title) {
                        // 每新开一个页面等待一秒
                        // await sleep(1000);
                        try {
                            const browser1 = await puppeteer.launch({
                                headless: false
                            });
                            const page1 = await browser1.newPage();
                            await page1.goto(url);
                            await page1.setViewport({
                                width: 1440,
                                height: 810,
                                deviceScaleFactor: 1
                            });
                            let data = await page1.evaluate((id, url, title) => {
                                let page1ResObj;
                                let detailsDom = document.getElementsByClassName('content-article')[0];
                                let detailContext = detailsDom ? detailsDom.innerHTML : '';
                                page1ResObj = {
                                    id,
                                    url,
                                    title,
                                    detailContext
                                };
                                return page1ResObj;
                            }, id, url, title);
                            console.log(data);
                            // 插入详情数据
                            let sql = `insert into hotspotselectiondetail(id,url,title,detail) 
            values('${data.id}','${data.url}','${data.title}','${data.detailContext}')`;
                            db.query(sql, (err, result) => {
                                if (err) {
                                    console.log("插入失败", err);
                                } else {
                                    console.log("插入成功");
                                }
                            })
                            await browser1.close();
                        } catch (err) {
                            await browser1.close();
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