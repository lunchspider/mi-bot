import Module from "node:module";
const require = Module.createRequire(import.meta.url);
import { GoogleAuth } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

const { spreadSheetId } = require('../config.json');

export const serviceAccountAuth = new GoogleAuth({
    keyFilename: './secrets.json', scopes: "https://www.googleapis.com/auth/spreadsheets"
});

export const spreadSheet = new GoogleSpreadsheet(spreadSheetId, serviceAccountAuth);
