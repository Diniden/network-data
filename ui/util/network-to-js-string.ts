import { INetworkData } from "../types";

/**
 * This method provides a way to convert a network object to short script that
 * can reproduce the networkwork quickly. This script will retain object
 * references so any circular dependencies will remain and single object
 * creation will remain as well.
 *
 * NOTE: This is INTENTIONALLY NOT a json object as json would not be able to
 * handle circular dependencies or handle singular object creation.
 *
 * WARN: This will NOT support functions as metadata. This expects objects and
 * primitives only throughout the data structure. If you provide a class object
 *
 * WARN: This will NOT support Maps, Sets, Symbols etc either. All will be
 * excluded.
 *
 * WARN: This is a DESTRUCTIVE method. It modifies the network in place thus
 * preventing deep copies of any sort. This is done intentionally to reduce the
 * burden on memory as large networks can have substantial amounts of
 * information.
 */
export function networkToJSString(network: INetworkData<any, any>): string {
  let objectUID = 0;
  const uidNumberToObject = new Map<number, { __id: number }>();
  const objectToUID = new Map<any, { __id: number }>();
  const objectMap = new Map<{ __id: number}, any>();

  function writeMeta(meta: any): { __id: number } | void {
    if (!(meta instanceof Object)) return meta;
    // If this is a UID object just return it
    if (meta.__id !== void 0) return meta;
    if (meta === void 0) return void 0;

    const checkUID = objectToUID.get(meta);
    if (checkUID !== void 0) return checkUID;

    // First write this objects reference to the uid mapping so deeper discovery
    // will have an immediate reference to retrieve thus preventing infinite
    // loops.
    const uid = objectUID++;
    const uidObject = { __id: uid };
    uidNumberToObject.set(uid, uidObject);
    objectToUID.set(meta, uidObject);
    objectMap.set(uidObject, meta);

    // Loop through the properties of the object to find subobjects. Each sub
    // object will register with the map and assigned a UID. Only primitives and
    // UIDs should be stored. The UID format is { __id: number }.
    const toDelete: any[] = [];

    for (const key in meta) {
      const val = meta[key];

      if (val instanceof Set || val.constructor === Symbol || val instanceof Function) {
        toDelete.push(key);
      }
      else if (val instanceof Object) {
        meta[key] = writeMeta(val);
      }
    }

    toDelete.forEach((key) => delete meta[key]);

    return uidObject;
  }

  // Convert the network to an object map
  writeMeta(network);

  return "";
}
