import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

async function openDatabase() {
    db = await SQLite.openDatabaseAsync('skola.db');
}

openDatabase();

const allTables = ["Grupo", "Estudiante"]

async function checkTableExists(tableName: string) {
    // Check if the items table exists if not create it
    var slqSttmnt = ``
    switch (tableName) {
        case "Grupo":
            slqSttmnt = `CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, objectId TEXT UNIQUE NOT NULL, name TEXT)`
            break;
        case "Estudiante":
            slqSttmnt = `CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, objectId TEXT UNIQUE NOT NULL, nombre TEXT, apellidos TEXT, grupoId TEXT)`
            break;
        case "User":
            slqSttmnt = `CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`
            break;
        default:
            slqSttmnt = `CREATE TABLE IF NOT EXISTS ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`
            break;
    }
    await db.execAsync(slqSttmnt)
}

// WHERE objectId = 1;
export async function readDBPromise(tableName: string, searchContidion: string, searchValue: any) {
    try {
        await checkTableExists(tableName);
        const selectStmt = `SELECT * FROM ${tableName} ${searchContidion}`;
        return await db.getAllAsync(selectStmt, searchValue);
    } catch (error) {
        console.error(`Error reading from table ${tableName}: ${error}`);
        return [];
    }
}

// colNames format: "(text, count)"
// valuesPlaceholder format: (?, ?)
// valuesArr format: ["string", 192]
export async function createRecordInTable(tableName: string, colNames: string, valuesPlaceholder: string, valuesArr: any[]) {
    await checkTableExists(tableName);
    const insertStmt = `INSERT INTO ${tableName} ${colNames} values ${valuesPlaceholder}`;
    return await db.runAsync(insertStmt, valuesArr);
}

export async function deleteItemInTable(objectId: any) {
    const result = await db.runAsync('DELETE FROM items WHERE id = ?', objectId);
    if (result.changes > 0) {
        console.log("SQLite Delete ok.");
    }
}

export async function resetTable(tableName: string) {
    const deleteStmt = `DELETE FROM ${tableName}`;
    await db.runAsync(deleteStmt);
    console.log("Table Reset ok.");
}

export async function resetTablePromise(tableName: string) {
    const deleteStmt = `DELETE FROM ${tableName}`;
    try {
        await db.runAsync(deleteStmt);
        return true;
    } catch (err) {
        console.log(`err: ${err}`);
        return err;
    }
}

export async function dropAllTables() {
    for (var table of allTables) {
        await dropTable(table)
    }
}

async function dropTable(tableName: string) {
    const deleteStmt = `DROP TABLE ${tableName}`;
    await db.runAsync(deleteStmt);
    console.log("Table DROP ok.");
}