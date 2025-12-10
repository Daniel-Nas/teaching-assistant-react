import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Solicitação de Autoavaliação - E2E", () => {

  //--------------------------------------------------------------------
  test("Teste 1: enviar para todos em uma meta", async ({ page }) => {
  await page.goto(BASE_URL);

  // Entrar em Evaluations
  await page.getByRole("button", { name: "Evaluations" }).click();

  // Selecionar a primeira turma
  await page.getByLabel("Select Class:").selectOption({ index: 1 });

  // Garantir que a tabela aparece
  await expect(page.getByText(/Envio imediato/i)).toBeVisible();

  // Scroll até o fim
  await page.mouse.wheel(0, 3000);

  // Clicar no primeiro “Enviar para todos”
  await page.getByRole("button", { name: /Enviar para todos/i }).first().click();

  // Verificar mensagem de sucesso (ajuste ao seu sistema)
  await expect(page.getByText(/Sucesso!/i)).toBeVisible();
});


  //--------------------------------------------------------------------
    test("Teste 2: enviar autoavaliação para um aluno", async ({ page }) => {
        await page.goto(BASE_URL);

        await page.getByRole("button", { name: "Evaluations" }).click();

        // Selecionar turma
        await page.getByLabel("Select Class:").selectOption({ index: 1 });

        // Garantir que a tabela carregou
        await expect(page.getByText(/Envio imediato/i)).toBeVisible();

        await page.mouse.wheel(0, 3000);

        // Selecionar o botão "Enviar" da primeira linha (um aluno)
        await page.getByRole("button", { name: /^Enviar$/i }).first().click();

        await expect(page.getByText(/Sucesso!/i)).toBeVisible();
    }); 

  //--------------------------------------------------------------------
    test("Teste 3: agendar solicitação", async ({ page }) => {
        await page.goto(BASE_URL);

        await page.getByRole("button", { name: "Evaluations" }).click();

        // Selecionar turma
        await page.getByLabel("Select Class:").selectOption({ index: 1 });

        // Abrir modal de agendamento
        await page.getByRole("button", { name: "Agendar solicitação" }).click();

        // Selecionar meta (select específico do modal)
        await page.locator("select.SelfEvaluation-selection").selectOption({ index: 2 });

        // Preencher 0 dias, 0 horas, 2 minutos
        const inputsDeTempo = page.locator('.SelfEvaluation-input-scheduler');

        // 1. Preenche o primeiro quadradinho (Dias)
        await inputsDeTempo.nth(0).fill("0");

        // 2. Preenche o segundo quadradinho (Horas)
        await inputsDeTempo.nth(1).fill("0");

        // 3. Preenche o terceiro quadradinho (Minutos)
        await inputsDeTempo.nth(2).fill("2");

        // Enviar agendamento
        await page.getByRole("button", { name: "Agendar solicitação de autoavaliação" }).click();

        // Verificar sucesso
        await expect(page.getByText(/sucesso/i)).toBeVisible();
    });
});