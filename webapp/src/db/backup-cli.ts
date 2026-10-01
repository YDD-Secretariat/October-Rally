// Manual backup: `npm run db:backup`
import { runBackup } from "./backup";

const dest = runBackup();
console.log(`Backup written to ${dest}`);
