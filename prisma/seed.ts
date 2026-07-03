import { bootstrapSystem } from '../server/lib/bootstrap.js';

async function main() {
  await bootstrapSystem();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
