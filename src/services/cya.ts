function cya<T>(unknownItem: T[]): Array<T> {
  const isArray = unknownItem instanceof Array;
  if (!isArray) {
    console.error('Expected an array, got ' + typeof unknownItem, unknownItem);
  }
  return isArray ? unknownItem : [];
}

export { cya }
