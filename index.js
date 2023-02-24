const core = require("@actions/core");
const { Toolkit } = require("actions-toolkit");
const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const { spawn } = require("child_process");
// https://weiyun0912.github.io/Wei-Docusaurus/docs/intro

// yml input
const GITHUB_TOKEN = core.getInput("GITHUB_TOKEN");
const MAX_LINES = core.getInput("MAX_LINES");
const COMMITTER_USERNAME = core.getInput("COMMITTER_USERNAME");
const COMMITTER_EMAIL = core.getInput("COMMITTER_EMAIL");
const COMMIT_MSG = core.getInput("COMMIT_MSG");

core.setSecret(GITHUB_TOKEN);

const baseUrl = "https://weiyun0912.github.io";

const exec = (cmd, args = [], options = {}) =>
  new Promise((resolve, reject) => {
    let outputData = "";
    const optionsToCLI = {
      ...options,
    };
    if (!optionsToCLI.stdio) {
      Object.assign(optionsToCLI, { stdio: ["inherit", "inherit", "inherit"] });
    }
    const app = spawn(cmd, args, optionsToCLI);
    if (app.stdout) {
      // Only needed for pipes
      app.stdout.on("data", function (data) {
        outputData += data.toString();
      });
    }

    app.on("close", (code) => {
      if (code !== 0) {
        return reject({ code, outputData });
      }
      return resolve({ code, outputData });
    });
    app.on("error", () => reject({ code: 1, outputData }));
  });

const commitReadmeFile = async () => {
  await exec("git", ["config", "--global", "user.email", COMMITTER_EMAIL]);

  if (GITHUB_TOKEN) {
    await exec("git", [
      "remote",
      "set-url",
      "origin",
      `https://${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`,
    ]);
  }

  await exec("git", ["config", "--global", "user.name", COMMITTER_USERNAME]);
  await exec("git", ["add", "."]);
  await exec("git", ["commit", "-m", COMMIT_MSG]);
  await exec("git", ["push"]);
};

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

  return outlineFilter;
}

Toolkit.run(async (tools) => {
  tools.log.success("Success");

  const outline = await getBlogOutline();

  const readmeContent = fs.readFileSync("./README.md", "utf-8").split("\n");

  console.log(readmeContent);

  let startIndex = readmeContent.findIndex(
    (content) => content.trim() === "<!-- UPDATE_WEISITE:START -->"
  );

  if (startIndex === -1) return tools.exit.failure("Not Found Tag");

  let endIndex = readmeContent.findIndex(
    (content) => content.trim() === "<!-- UPDATE_WEISITE:END -->"
  );

  if (startIndex !== -1 && endIndex === -1) {
    startIndex++;

    outline.forEach((o, index) => {
      readmeContent.splice(
        startIndex + index,
        0,
        `- ${o.title} [連結](${o.link})`
      );
    });

    readmeContent.splice(
      startIndex + outline.length,
      0,
      "<!-- UPDATE_WEISITE:END -->"
    );

    fs.writeFileSync("./README.md", readmeContent.join("\n"));

    try {
      await commitReadmeFile();
    } catch (error) {
      return tools.exit.failure(error);
    }

    tools.exit.success("Success");
  }

  //比較
});
