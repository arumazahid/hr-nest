export const brandVars = (co: any): any => {
  const p = co?.brand_primary || '#0F172A'
  const a = co?.brand_accent || '#FACC15'
  return {
    '--p': p, '--a': a, '--on': '#0F172A',
    '--t': `color-mix(in srgb, ${a} 24%, #fff)`, '--t2': `color-mix(in srgb, ${a} 9%, #fff)`
  }
}
