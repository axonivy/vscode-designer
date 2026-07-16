export const downloadIar = async (url: string, targetDir: string, logger: (message: string) => void): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    return Promise.reject(`Download IAR failed with status code ${response.status}`);
  }
  console.log(response);
  console.log(targetDir);
  logger('Test log');
};

// const run = () => {
//   const url = process.argv[2]
//     ? process.argv[2]
//     : 'https://jenkins.ivyteam.io/job/demo-projects/job/master/lastSuccessfulBuild/artifact/connectivity/connectivity-demos/target/';
//   downloadIar(url, '', console.log);
// };

// run();
