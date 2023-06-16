import courses from "./data/percipio.json";
import { env } from "./lib/env";
import { createId } from "@paralleldrive/cuid2";
import { Course, Reply } from "./types";
import { storeStream } from "./lib/file-storage";
import playwright from "playwright";
import { retry } from "./lib/utils";
import { start } from "repl";

const MAX_COUNT = -1;

export default {};

async function main() {
  const browser = await playwright.chromium.launch({
    channel: "msedge",
    proxy: {
      server: "http://sia-lb.telekom.de:8080",
    },
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://sia.telekom.de");
  console.log(`Proxy authenticated.`);

  async function processBatch(startIndex = 0, count: number) {
    const sessionId = createId();
    console.log(`Session ID: ${sessionId}`);

    const res = await page.request.post(
      "https://gptchatapi.azurewebsites.net/api/chat3",
      {
        data: {
          token: env.GPT_API_KEY,
          session_id: sessionId,
          user_input: `
        You are an assistant that only speaks JSON. Do not write normal text. 
        You get one course title and description at a time and try to predict the expertise level and the skills. 
        For the expertise levels, the possible values are: 'Beginner', 'Intermediate', 'Advanced'. 
        If the expertise level cannot be determined, either because it's for everyone or because you are not at least 95% sure, then answer with 'Everyone'.
        For the skills, you will write an array of short skill names that this training help build. The skill names should not be longer than 3 words, separated by comma. 
        The array of skills will contain maximum 5 skills and the skills must be in English language.
        The answer must be a JSON in the following format: { "skills": [SKILL ARRAY], "expertiseLevel": "PREDICTION", "confidenceRate": "%-VALUE" }. Ready?
      `,
        },
      }
    );

    if (!res.ok()) throw new Error("Initial request failed");

    for (const course of (courses as Course[]).slice(startIndex)) {
      if (startIndex > count) continue;
      const isFirst = count === 1;
      const separator = isFirst ? "" : ",";
      const res = await retry(
        () =>
          page.request.post("https://gptchatapi.azurewebsites.net/api/chat3", {
            data: {
              token: env.GPT_API_KEY,
              session_id: sessionId,
              user_input: `Title: ${course.COURSE_TITLE}. Description: ${course.COURSE_DESCRIPTION}`,
            },
          }),
        {
          retries: 3,
          minTimeout: 10_000,
          maxTimeout: 30_000,
          onRetry: () => {
            console.log(`Retrying request #${count}`);
          },
        }
      );
      // Abort if not successful request
      if (!res.ok()) throw new Error(`Request #${count} failed`);

      const data = (await res.json()) as Reply[];
      const lastReply = data.at(-1).content;
      console.log({
        count,
        id: course.COURSE_ID,
        title: course.COURSE_TITLE,
        lastReply,
      });

      try {
        srcStream.write(
          separator +
            JSON.stringify({
              id: course.COURSE_ID,
              title: course.COURSE_TITLE,
              ...JSON.parse(lastReply),
            })
        );
      } catch (e) {
        console.log(
          `Record #${count} failed parsing response ${lastReply}`,
          e.message
        );
      }
      count++;
      if (count === MAX_COUNT) break;
    }
  }

  // Create storage stream for output
  const { srcStream, done } = await storeStream("", "output.json");
  // Begin stream
  srcStream.write("[");

  // Mutable count to be passed down
  let successfulCount = 0;
  async function processBatchWithRetry() {
    try {
      await processBatch(successfulCount, successfulCount);
    } catch (e) {
      console.log(`Starting another batch due to error: `, e.message);
      await processBatchWithRetry();
    }
  }
  await processBatchWithRetry();

  // End stream
  srcStream.write("]");
  srcStream.end();
  await done;

  await browser.close();
  return;
}

main().then(() => console.log("Done"));
