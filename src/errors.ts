/** Errors name what went wrong and what the caller should do about it. */

export class VernError extends Error {
  readonly detail: unknown;
  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = new.target.name;
    this.detail = detail;
  }
}

/** A contract call returned nothing usable. */
export class CallError extends VernError {}

/** Decimals could not be sourced, so no reading can be produced. */
export class DecimalsUnavailableError extends VernError {
  constructor(contract: string, detail?: unknown) {
    super(
      `could not read decimals() from ${contract}. vern will not guess: a balance scaled by an assumed ` +
        `18 decimals is wrong by a factor of 10^12 for a 6 decimal token.`,
      detail,
    );
  }
}

/** A simulated write would move balances outside the caller's stated bounds. */
export class GuardError extends VernError {}
