import Module from "node:module";
const require = Module.createRequire(import.meta.url);
import { GoogleAuth } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

const { spreadSheetId, getInfoSpreadSheetId, getInfoOutputSpreadSheetId } = require('../config.json');

export const serviceAccountAuth = new GoogleAuth({
    keyFilename: './secrets.json', scopes: "https://www.googleapis.com/auth/spreadsheets"
});

export const orderSpreadSheet = new GoogleSpreadsheet(spreadSheetId, serviceAccountAuth);
export const getInfoSpreadSheet = new GoogleSpreadsheet(getInfoSpreadSheetId, serviceAccountAuth);
export const getInfoOutputSpreadSheet = new GoogleSpreadsheet(getInfoOutputSpreadSheetId, serviceAccountAuth);
