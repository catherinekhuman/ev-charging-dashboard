// Electrical profile of a laptop charging from a 65 W adapter.
// Output follows the resolution of the PZEM-004T v3.0 meter:
// voltage 0.1 V, current 0.001 A, power 0.1 W, frequency 0.1 Hz, power factor 0.01.

function gauss() {
  // Box-Muller transform: normally distributed random number
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createLoadProfile() {
  let volts = 230.0; // mains voltage drifts slowly, so it is kept between readings

  // t = seconds since the charger started drawing power
  return function nextReading(t) {
    // 1. Mains voltage: slow drift around 230 V
    volts += (230 - volts) * 0.08 + gauss() * 0.12;
    volts = Math.min(233.5, Math.max(226.5, volts));

    // 2. Active power: rises while the charger negotiates, then holds near
    //    63 W (bulk charging) and tapers very slowly as the battery fills
    const ramp = 1 - Math.exp(-t / 3.5);
    const plateau = Math.max(35, 63 - 0.004 * t);
    let power = plateau * ramp + gauss() * 0.7;
    if (Math.random() < 0.05) power += (Math.random() - 0.3) * 3; // brief CPU/fan load change
    power = Math.min(65.5, Math.max(0, power));

    // 3. Power factor: a 65 W adapter has no power factor correction
    const pf = 0.61 + 0.02 * Math.sin(t / 45) + gauss() * 0.004;

    // 4. Current follows from P = V x I x PF
    const current = power / (volts * pf);

    return {
      voltage: Number(volts.toFixed(1)),
      current: Number(current.toFixed(3)),
      power: Number(power.toFixed(1)),
      frequency: Number((50 + gauss() * 0.05).toFixed(1)),
      powerFactor: Number(pf.toFixed(2)),
    };
  };
}