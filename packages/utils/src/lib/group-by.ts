/**
 * Groups the elements of an array based on the provided keyGetter function.
 *
 * @param value - The array to group.
 * @param {function(item T, number, array T[]): string | number} keyGetter - A function that takes an element, its
 * index, and
 * the array, and returns a key to group by.
 * @returns {Record<string, array T>} - An object where the keys are the results of the keyGetter function and the
 * values are arrays of elements that correspond to those keys.
 */
export function groupBy<T>(
  value: T[],
  keyGetter: (item: T, index: number, array: T[]) => string | number | { toString: () => string },
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  value?.forEach((item, index) => {
    const key = keyGetter(item, index, value)?.toString();
    if (key) {
      groups[key] ??= [];
      groups[key].push(item);
    }
  });
  return groups;
}


// function main(): void{
//   const data = [
//     { name: 'Alice', age: 30 },
//     { name: 'Bob', age: 25 },
//     { name: 'Charlie', age: 30 },
//     { name: 'David', age: 25 },
//   ];

//   const groupedByAge = groupBy(data, item => item.age);
//   console.log(groupedByAge); 
//   
//   
//   # Output:
//   {
//     '25': [
//       { name: 'Bob', age: 25 },
//       { name: 'David', age: 25 }
//     ],
//     '30': [
//       { name: 'Alice', age: 30 },
//       { name: 'Charlie', age: 30 }
//     ]
//   }
//   
// }
