// 百度-游戏
const express = require('express');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const sleep = require('../util/sleep');
const router = express.Router();
const { db } = require('../config/db');
router.get('/gamechart', async (req, res) => {
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
    let sql = `select * from timedtasks where title = '百度-游戏'`;
    db.query(sql, (err, result) => {
        if (err) {
            console.log("失败!!");
        } else {
            schedule.cancelJob("gamechart")
            if (result[0].isOpen == 'true') {
                schedule.scheduleJob("gamechart", result[0].seconds, async () => {
                    console.log('百度-游戏--gamechart:' + new Date());
                    db.query(`truncate table gamechart`, (err, result) => {
                        if (err) {
                            console.log("清空失败");
                        } else {
                            console.log("清空成功");
                        }
                    })
                    // 启动浏览器
                    const browser = await puppeteer.launch({
                        headless: true
                    });
                    // 控制浏览器打开新标签页面
                    const page = await browser.newPage();
                    await page.goto('https://top.baidu.com/board?tab=game');
                    await page.setViewport({
                        width: 1440,
                        height: 810,
                        deviceScaleFactor: 1
                    });
                    let clickDoms = await page.$$('.container.rel>.left-side_1rpOJ.c-font-normal>.tags-wrap_InWap');
                    let typeList = await clickDoms[0].$$('.tags_1mjZF>.tag-item_2erEC');
                    // let areaList = await clickDoms[1].$$('.tags_1mjZF>.tag-item_2erEC');

                    for (let i = 0; i < typeList.length; i++) {
                        await sleep(1000);
                        // 每次都要重新获取点击的元素
                        let tempClickDoms1 = await page.$$('.container.rel>.left-side_1rpOJ.c-font-normal>.tags-wrap_InWap');
                        let tempTypeList = await tempClickDoms1[0].$$('.tags_1mjZF>.tag-item_2erEC');
                        await tempTypeList[i].click();
                        // for (let j = 0; j < areaList.length; j++) {
                        await sleep(1000);
                        // 每次都要重新获取点击的元素
                        // let tempClickDoms2 = await page.$$('.container.rel>.left-side_1rpOJ.c-font-normal>.tags-wrap_InWap');
                        // let tempAreaList = await tempClickDoms2[1].$$('.tags_1mjZF>.tag-item_2erEC');
                        // await tempAreaList[j].click();
                        // console.log(await page.url());
                        const browser1 = await puppeteer.launch({
                            headless: true
                        });
                        // 控制浏览器打开新标签页面
                        const page1 = await browser1.newPage();
                        await page1.goto(await page.url());
                        await page1.setViewport({
                            width: 1440,
                            height: 810,
                            deviceScaleFactor: 1
                        });
                        // 在这爬取数据
                        let data = await page1.evaluate(() => {
                            let res = [];
                            let typeList = document.querySelectorAll('.path-wrapper_3euWM>.c-font-normal.c-color-gray2');
                            let classificationType = typeList[1] ? typeList[1].textContent.trim() : '';
                            let classificationArea = typeList[2] ? typeList[2].textContent.trim() : '';
                            let contentList = document.querySelectorAll('.category-wrap_iQLoo');
                            for (let i = 0; i < contentList.length; i++) {
                                // 跳转连接
                                let leftDom = contentList[i].querySelector('.img-wrapper_29V76');
                                let jumpLink = leftDom ? leftDom.getAttribute('href') : '';
                                let rankDom = leftDom.querySelector('.index_1Ew5p');
                                let ranks = rankDom ? rankDom.textContent.trim() : '';
                                let imgDom = leftDom.querySelector('img');
                                let img = imgDom ? imgDom.getAttribute('src') : '';
                                // 热度
                                let heatDom = contentList[i].querySelector('.trend_2RttY>.hot-index_1Bl1a');
                                let heat = heatDom ? heatDom.textContent.trim() : '';
                                let heatTitleDom = contentList[i].querySelector('.trend_2RttY>.text_1lUwZ');
                                let heatTitle = heatTitleDom ? heatTitleDom.textContent.trim() : '';
                                let titleDom = contentList[i].querySelector('.content_1YWBm>.title_dIF3B>.c-single-text-ellipsis');
                                let title = titleDom ? titleDom.textContent.trim() : '';
                                let typeDom = contentList[i].querySelectorAll('.content_1YWBm>.intro_1l0wp');
                                let type = typeDom[0] ? typeDom[0].textContent.trim() : '';
                                let actor = typeDom[1] ? typeDom[1].textContent.trim() : '';
                                let contextDom = contentList[i].querySelector('.content_1YWBm>.c-single-text-ellipsis.desc_3CTjT');
                                let context = contextDom ? contextDom.textContent.trim() : '';
                                res.push({
                                    classificationType: classificationType.replace('/', '').trim(),
                                    classificationArea: classificationArea.replace('/', '').trim(),
                                    title,
                                    type,
                                    actor,
                                    context,
                                    heat,
                                    heatTitle,
                                    jumpLink,
                                    ranks,
                                    img
                                });
                            }
                            return res;
                        });
                        // console.log(data);
                        for (let i = 0; i < data.length; i++) {
                            let { classificationType, classificationArea, title, type, actor, context, heat, heatTitle, jumpLink, ranks, img } = data[i];
                            let sql = `insert into gamechart(classificationType,classificationArea,title,type,actor,context,heat,heatTitle,jumpLink,ranks,img,time,id)
                                values('${classificationType}','${classificationArea}','${title}','${type}','${actor}','${context}','${heat}','${heatTitle}','${jumpLink}','${ranks}','${img}','${moment().format("YYYY-MM-DD")}','${uuid.v1()}')`
                            db.query(sql, (err, result) => {
                                if (err) {
                                    console.log("插入失败", err);
                                } else {
                                    console.log("插入成功");
                                }
                            })
                        }
                        await browser1.close();

                        // }
                    }
                    await browser.close();
                });
            }
        }
    })
}
timedtasksFun();

module.exports = router;