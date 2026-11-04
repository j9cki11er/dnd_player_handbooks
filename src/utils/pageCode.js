export function pageCode(page) {
    let hash = 0xcbf29ce484222325n;
    for (const character of page) {
        hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 0x100000001b3n);
    }
    return hash.toString(36);
}
