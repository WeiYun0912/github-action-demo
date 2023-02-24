const core = require("@actions/core");
const { Toolkit } = require("actions-toolkit");
const cheerio = require("cheerio");
const axios = require("axios");

// https://weiyun0912.github.io/Wei-Docusaurus/docs/intro

const MAX_LINES = core.getInput("MAX_LINES");

const baseUrl = "https://weiyun0912.github.io";

async function getBlogOutline() {
  const { data } = await axios.get(
    "https://weiyun0912.github.io/Wei-Docusaurus/docs/intro"
  );
  const $ = cheerio.load(data);

  const Logs = $("h1:contains('Logs')").next().children();

  const outline = [];

  Logs.each((_, el) => {
    const logDetail = {
      title: "",
      link: "",
    };

    const link = baseUrl + $(el).children().attr("href");

    logDetail.title = $(el).text();
    if (link.includes(" ")) {
      logDetail.link = link.replace(" ", "%20");
    } else {
      logDetail.link = link;
    }
    outline.push(logDetail);
  });

  const outlineFilter = outline.slice(0, MAX_LINES); //MAX_LINES

  console.log(outlineFilter);

  return outlineFilter;
}

Toolkit.run(async (tools) => {
  tools.log.success("Success");

  await getBlogOutline();

  tools.exit.success("Test Success");
});
