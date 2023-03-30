// 百度-热搜
const express = require('express');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const sleep = require('../util/sleep');
const router = express.Router();
const { db } = require('../config/db');
router.get('/baiduhotsearch', async (req, res) => {
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
    let sql = `select * from timedtasks where title = '百度-热搜'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("baiduhotsearch")
            if (result[0].isOpen == 'true') {
                schedule.scheduleJob("baiduhotsearch", result[0].seconds, async () => {
                    console.log('百度-热搜--baiduhotsearch:' + new Date());
                    const browser = await puppeteer.launch({
                        headless: false
                    });
                    const page = await browser.newPage();
                    await page.goto("https://top.baidu.com/board?tab=realtime");
                    // await page.goto("https://top.baidu.com/board?tab=novel")
                    await page.setViewport({
                        width: 1400,
                        height: 810,
                        deviceScaleFactor: 1
                    });
                    let data = await page.evaluate(() => {
                        let res = [];
                        let contentList = document.querySelectorAll(".category-wrap_iQLoo.horizontal_1eKyQ");
                        for (let i = 0; i < contentList.length; i++) {
                            // 跳转链接
                            let jumpLinkDom = contentList[i].querySelector('.img-wrapper_29V76');
                            let jumpLink = jumpLinkDom ? jumpLinkDom.getAttribute('href') : '';
                            // imgDom
                            let imgDom = contentList[i].querySelector('.img-wrapper_29V76>img');
                            let img = imgDom ? imgDom.getAttribute('src') : '';
                            // icon
                            let iconDom = contentList[i].querySelector('.img-wrapper_29V76>.index_1Ew5p.c-index-bg1>img');
                            let icon = iconDom ? iconDom.getAttribute('src') : '';
                            // 热搜指数
                            let HotSearchIndexDom = contentList[i].querySelector('.trend_2RttY.hide-icon>.hot-index_1Bl1a');
                            let HotSearchIndex = HotSearchIndexDom ? HotSearchIndexDom.textContent.trim() : '';
                            // 热手指数标题
                            let HotSearchIndexTitleDom = contentList[i].querySelector('.trend_2RttY.hide-icon>.text_1lUwZ');
                            let HotSearchIndexTitle = HotSearchIndexTitleDom ? HotSearchIndexTitleDom.textContent.trim() : '';
                            // 标题
                            let titleDom = contentList[i].querySelector('.content_1YWBm>a>.c-single-text-ellipsis');
                            let title = titleDom ? titleDom.textContent.trim() : '';
                            // 内容
                            let contextDom = contentList[i].querySelector('.content_1YWBm>.hot-desc_1m_jR.large_nSuFU ');
                            let context = contextDom ? contextDom.textContent.trim() : '';
                            res.push({
                                id: i,
                                jumpLink,
                                img,
                                icon,
                                HotSearchIndex,
                                HotSearchIndexTitle,
                                title,
                                context
                            })
                        }
                        return res;
                    })
                    db.query('truncate table baiduhotsearch', (err, data) => {
                        if (err) {
                            console.log("出错了!");
                        } else {
                            addData();
                        }
                    })
                    function addData() {
                        for (let i = 0; i < data.length; i++) {
                            let { id, jumpLink, img, icon, HotSearchIndex, HotSearchIndexTitle, title, context } = data[i];
                            let sql = `insert into baiduhotsearch(id,jumpLink,img,icon,HotSearchIndex,HotSearchIndexTitle,title,context)
                            values('${id}','${jumpLink}','${img}','${icon}','${HotSearchIndex}','${HotSearchIndexTitle}','${title}','${context}')`
                            db.query(sql, (err, res) => {
                                if (err) {
                                    console.log("插入失败!");
                                } else {
                                    console.log("插入成功!");
                                }
                            })
                        }
                    }
                    await browser.close();
                });

            }
        }
    })
}
timedtasksFun();

module.exports = router;