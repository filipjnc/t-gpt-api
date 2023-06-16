import asyncRetry from "async-retry";

export const retry = asyncRetry;

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const timeout = async <T>(
  asyncPromise: Promise<T>,
  timeLimit: number
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Async call timeout limit reached")),
      timeLimit
    );
  });

  return Promise.race([asyncPromise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutHandle);
    return result as T;
  });
};
