const express = require('express');
const app = express();

app.use("/grab", require('./grab/1.hotlist'));
app.use("/grab", require('./grab/2.hotspotselection'));
app.use("/grab", require('./grab/3.baiduhotsearch'));
app.use("/grab", require('./grab/4.fictionlist'));
app.use("/grab", require('./grab/5.filmlist'));
app.use("/grab", require('./grab/6.gamechart'));
app.use("/grab", require('./grab/7.tvserieslist'));
app.use("/grab", require('./grab/8.immediatehotspotlatest'));
app.use("/grab", require('./grab/9.immediatehotspot'));
app.use("/grab", require('./grab/10.marketnews'));
app.use("/grab", require('./grab/11.categories1'));
app.use("/grab", require('./grab/12.categories2'));
app.use("/grab", require('./grab/13.categories3'));
app.use("/grab", require('./grab/14.categories4'));
app.use("/grab", require('./grab/15.categories5'));
app.use("/grab", require('./grab/16.categories6'));
app.use("/grab", require('./grab/test'))

let port = 9000;
app.listen(port, () => {
    console.log("服务运行成功", port);
})
