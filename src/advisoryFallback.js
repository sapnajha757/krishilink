const getWeatherSeasonCrops = (avgTemp, avgRainMm) => {
  if (avgRainMm >= 8) return ['Paddy', 'Maize', 'Soybean']
  if (avgTemp >= 30) return ['Bajra', 'Moong', 'Groundnut']
  if (avgTemp <= 22) return ['Wheat', 'Mustard', 'Chickpea']
  return ['Vegetables', 'Pulses', 'Millets']
}

const buildFallbackForecast = () => {
  const conditions = ['Clear', 'Clouds', 'Light Rain', 'Clouds', 'Rain', 'Clear', 'Clouds']
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return {
      date: date.toISOString().slice(0, 10),
      temp_min_c: 24 + (index % 3),
      temp_max_c: 33 + (index % 2),
      humidity: 65 + (index % 4) * 4,
      rain_mm: index % 2 === 0 ? 4 : 1,
      condition: conditions[index],
      predicted: true,
    }
  })
}

/** Offline advisory when API is unreachable (same logic as server fallback). */
export function getLocalWeatherAdvisory(location) {
  const forecast = buildFallbackForecast()
  const avgTemp =
    forecast.reduce((sum, day) => sum + (day.temp_max_c + day.temp_min_c) / 2, 0) / forecast.length
  const avgRain = forecast.reduce((sum, day) => sum + day.rain_mm, 0) / forecast.length
  const crops = getWeatherSeasonCrops(avgTemp, avgRain)

  const advisory = [
    `Location: ${location}`,
    `Next 7-day avg temp: ${avgTemp.toFixed(1)} C`,
    `Next 7-day avg rain: ${avgRain.toFixed(1)} mm/day`,
    `Best crop options: ${crops.join(', ')}`,
    'Action: Monitor soil moisture and plan sowing based on irrigation and expected rainfall.',
    '(Offline estimate — connect API server for live weather.)',
  ].join('\n')

  return { advisory, forecast, source: 'local' }
}
