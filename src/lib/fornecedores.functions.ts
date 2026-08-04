import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const geocodificarEndereco = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ endereco: z.string().trim().min(3).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Google Maps não configurado");

    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(data.endereco)}&region=br&language=pt-BR`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Falha na busca de endereço [${res.status}]: ${body}`);
    }
    const json: any = await res.json();
    const r = json?.results?.[0];
    if (!r) return null;
    const comp = (t: string) =>
      r.address_components?.find((c: any) => c.types?.includes(t))?.long_name ?? "";
    const compShort = (t: string) =>
      r.address_components?.find((c: any) => c.types?.includes(t))?.short_name ?? "";
    return {
      endereco: r.formatted_address as string,
      cidade: comp("administrative_area_level_2") || comp("locality"),
      estado: compShort("administrative_area_level_1"),
      cep: comp("postal_code"),
      lat: r.geometry?.location?.lat as number,
      lng: r.geometry?.location?.lng as number,
    };
  });

export const reverterCoordenadas = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ lat: z.number(), lng: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) throw new Error("Google Maps não configurado");

    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=pt-BR`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Falha ao ler endereço [${res.status}]: ${body}`);
    }
    const json: any = await res.json();
    const r = json?.results?.[0];
    if (!r) return null;
    const comp = (t: string) =>
      r.address_components?.find((c: any) => c.types?.includes(t))?.long_name ?? "";
    const compShort = (t: string) =>
      r.address_components?.find((c: any) => c.types?.includes(t))?.short_name ?? "";
    return {
      endereco: r.formatted_address as string,
      cidade: comp("administrative_area_level_2") || comp("locality"),
      estado: compShort("administrative_area_level_1"),
      cep: comp("postal_code"),
    };
  });
