import { describe, expect, it } from "vitest";

import { DEFAULT_CONTACT_EMAIL, contactFromSettings } from "@/lib/site";

describe("contactFromSettings", () => {
  it("lit le format du seed du Core (contact + opening_hours)", () => {
    const settings = {
      contact: { email: "hello@globalitss.com", phone: "+33 1 00 00 00 00" },
      opening_hours: { fr: "Lun-Ven 9h-18h", en: "Mon-Fri 9am-6pm" },
    };
    expect(contactFromSettings(settings, "en")).toEqual({ email: "hello@globalitss.com", phone: "+33 1 00 00 00 00", hours: "Mon-Fri 9am-6pm" });
    expect(contactFromSettings(settings, "fr").hours).toBe("Lun-Ven 9h-18h");
  });

  it("les clés plates priment sur l'objet", () => {
    const s = { contact: { email: "a@b.fr", phone: "1" }, contact_email: "flat@b.fr", contact_phone: "2" };
    expect(contactFromSettings(s, "fr")).toMatchObject({ email: "flat@b.fr", phone: "2" });
  });

  it("retombe sur des valeurs par défaut sûres", () => {
    expect(contactFromSettings({}, "fr")).toEqual({ email: DEFAULT_CONTACT_EMAIL, phone: null, hours: null });
    expect(contactFromSettings({ contact: "n'importe quoi", opening_hours: [1] }, "fr")).toEqual({ email: DEFAULT_CONTACT_EMAIL, phone: null, hours: null });
  });
});
