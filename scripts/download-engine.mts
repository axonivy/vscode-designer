import { downloadEngine } from '../extension/src/engine/download.ts';

function run() {
  const url = process.argv[2]
    ? process.argv[2]
    : 'https://jenkins.ivyteam.io/job/core_product-engine/job/master/lastSuccessfulBuild/artifact/workspace/ch.ivyteam.ivy.server.product/target/products/*_Slim_*.zip/*zip*/products.zip';
  downloadEngine(url, '', console.log, 'AxonIvyEngine');
}

run();
