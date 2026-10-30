import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Landing, type LandingData } from "@/components/site/landing";
import { FALLBACK_POLES } from "@/lib/i18n";
import { lastCall, mockApi, POLES } from "./helpers";

const data = (over: Partial<LandingData> = {}): LandingData => ({
  poles: [...FALLBACK_POLES],
  references: [],
  contact: { email: "contact@globalitss.com", phone: null },
  ...over,
});

function mockMatchMedia(match: (query: string) => boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: match(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("Landing", () => {
  it("rend toutes les sections en français", () => {
    render(<Landing lang="fr" data={data()} />);

    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(document.querySelector(".gsms-motion-reveal")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("L'informatique, orchestrée avec exigence.");
    expect(screen.getByRole("heading", { name: /Neuf expertises, un interlocuteur/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Une méthode, des engagements/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Parlons de votre projet/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Une question/ })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("présente le moteur IA en français et en anglais", () => {
    const { unmount } = render(<Landing lang="fr" data={data()} />);
    const fr = document.getElementById("engine")!;
    expect(within(fr).getByRole("heading", { name: /Vos connaissances, mises au travail/ })).toBeInTheDocument();
    expect(within(fr).getAllByRole("article")).toHaveLength(4);
    expect(within(fr).getByRole("link", { name: /Demander une démonstration/ })).toHaveAttribute("href", "#booking");
    unmount();

    render(<Landing lang="en" data={data()} />);
    const en = document.getElementById("engine")!;
    expect(within(en).getByRole("heading", { name: "Team memory" })).toBeInTheDocument();
  });

  it("le lien « Espace pro » pointe vers l'application gsms", () => {
    render(<Landing lang="fr" data={data()} />);
    expect(screen.getByRole("link", { name: "Espace professionnel" })).toHaveAttribute("href", "http://localhost");
  });

  it("affiche les 9 pôles (repli statique)", () => {
    render(<Landing lang="fr" data={data()} />);
    const section = document.getElementById("poles")!;
    expect(within(section).getAllByRole("article")).toHaveLength(9);
    expect(within(section).getByRole("heading", { name: "Cybersécurité" })).toBeInTheDocument();
  });

  it("rend la version anglaise avec les noms anglais des pôles", () => {
    render(<Landing lang="en" data={data()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("IT, orchestrated with rigour.");
    expect(screen.getByRole("heading", { name: "Software development" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Language: FR/i })).toHaveAttribute("href", "/fr");
  });

  it("le sélecteur de langue pointe vers l'autre langue", () => {
    render(<Landing lang="fr" data={data()} />);
    expect(screen.getByRole("link", { name: /Langue: EN/i })).toHaveAttribute("href", "/en");
  });

  it("sur viewport mobile, le contenu hero et les pôles restent visibles (pas de reveal JS)", () => {
    mockMatchMedia((q) => q.includes("max-width: 768px"));
    render(<Landing lang="fr" data={data()} />);

    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    const poles = document.getElementById("poles")!;
    for (const article of within(poles).getAllByRole("article")) {
      expect(article).toBeVisible();
    }
    expect(document.querySelector(".gsms-motion-hero-copy")).toBeTruthy();
  });

  it("utilise le logo de la marque en en-tête (transparent) et en pied de page (niveaux de gris)", () => {
    render(<Landing lang="fr" data={data()} />);
    const srcs = screen.getAllByRole("img").map((i) => decodeURIComponent(i.getAttribute("src") ?? ""));
    expect(srcs.some((s) => s.includes("logo-transparent.svg"))).toBe(true);
    expect(srcs.some((s) => s.includes("logo-grayscale.svg"))).toBe(true);
  });

  it("affiche les réalisations publiées, sinon un message", () => {
    const { unmount } = render(<Landing lang="fr" data={data()} />);
    expect(screen.getByText("Nos études de cas arrivent bientôt.")).toBeInTheDocument();
    unmount();

    render(
      <Landing
        lang="fr"
        data={data({
          references: [{ id: 1, kind: "realisation", slug: "migration-m365", lang: "fr", title: "Migration Microsoft 365", summary: "50 postes migrés.", body: "", published_at: null }],
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Migration Microsoft 365" })).toBeInTheDocument();
    expect(screen.getByText("50 postes migrés.")).toBeInTheDocument();
  });

  it("affiche le téléphone seulement s'il est renseigné", () => {
    const { unmount } = render(<Landing lang="fr" data={data()} />);
    expect(screen.queryByRole("link", { name: /01 02/ })).toBeNull();
    expect(screen.getByRole("link", { name: "contact@globalitss.com" })).toHaveAttribute("href", "mailto:contact@globalitss.com");
    unmount();

    render(<Landing lang="fr" data={data({ contact: { email: "x@y.fr", phone: "01 02 03 04 05" } })} />);
    expect(screen.getByRole("link", { name: "01 02 03 04 05" })).toHaveAttribute("href", "tel:0102030405");
  });
});

describe("Formulaire rendez-vous / devis", () => {
  const poles = POLES.map((p) => ({ ...p }));

  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Nom complet"), "Bob Durand");
    await user.type(screen.getByLabelText("E-mail"), "bob@durand.fr");
    await user.type(screen.getByLabelText("Sujet"), "Audit réseau");
  }

  it("envoie une demande de rendez-vous à l'API publique", async () => {
    const fetchMock = mockApi([{ match: "/public/appointments", method: "POST", status: 201, body: { id: 1 } }]);
    const user = userEvent.setup();
    render(<Landing lang="fr" data={data({ poles })} />);

    await fill(user);
    await user.selectOptions(screen.getByLabelText("Pôle concerné"), "2");
    await user.click(screen.getByRole("button", { name: "Réserver ce créneau" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Merci !");
    const { json, init } = lastCall(fetchMock, "POST", "/public/appointments");
    expect(json).toMatchObject({ contact_name: "Bob Durand", contact_email: "bob@durand.fr", subject: "Audit réseau", pole_id: 2, duration_minutes: 30 });
    expect(new Date(json.starts_at).toString()).not.toBe("Invalid Date");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("une demande de devis est transmise avec un sujet préfixé", async () => {
    const fetchMock = mockApi([{ match: "/public/appointments", method: "POST", status: 201, body: { id: 2 } }]);
    const user = userEvent.setup();
    render(<Landing lang="fr" data={data({ poles })} />);

    await user.click(screen.getByRole("tab", { name: "Devis" }));
    await fill(user);
    await user.type(screen.getByLabelText("Votre besoin"), "Refonte du Wi-Fi pour 20 postes");
    await user.click(screen.getByRole("button", { name: "Envoyer ma demande de devis" }));

    await screen.findByRole("status");
    const { json } = lastCall(fetchMock, "POST", "/public/appointments");
    expect(json.subject).toBe("Demande de devis — Audit réseau");
    expect(json.notes).toBe("Refonte du Wi-Fi pour 20 postes");
  });

  it("affiche l'erreur renvoyée par l'API", async () => {
    mockApi([{ match: "/public/appointments", method: "POST", status: 409, body: { detail: "Ce créneau est déjà pris" } }]);
    const user = userEvent.setup();
    render(<Landing lang="fr" data={data({ poles })} />);

    await fill(user);
    await user.click(screen.getByRole("button", { name: "Réserver ce créneau" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ce créneau est déjà pris");
  });

  it("affiche un message générique si le Core est injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const user = userEvent.setup();
    render(<Landing lang="en" data={data({ poles })} />);

    await user.type(screen.getByLabelText("Full name"), "Bob");
    await user.type(screen.getByLabelText("Email"), "bob@durand.fr");
    await user.type(screen.getByLabelText("Subject"), "Hello");
    await user.click(screen.getByRole("button", { name: "Book this slot" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sending failed");
  });
});
