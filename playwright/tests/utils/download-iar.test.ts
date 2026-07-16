import { test } from 'vitest';
import { downloadIar } from './download-iar';

test('executes downloadIar', async () => {
  await downloadIar(
    'https://jenkins.ivyteam.io/job/demo-projects/job/master/lastSuccessfulBuild/artifact/connectivity/connectivity-demos/target/',
    '/tmp',
    message => console.log(message)
  );
});
