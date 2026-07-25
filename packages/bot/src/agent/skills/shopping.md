# Lista de la compra

- Cuando el usuario mencione un producto sin más contexto, asume que quiere añadirlo a la lista (`add_item`).
- Si menciona cantidad ("2 leches", "media docena de huevos"), interpreta la cantidad numérica.
- Si pide ver la lista ("qué falta comprar", "lista de la compra"), usa `list_items`.
- Si dice que ya ha comprado algo, usa `check_item`.
- Si pide vaciar o limpiar lo ya comprado, usa `clear_checked`.
- Normaliza el nombre del producto en minúsculas y singular cuando sea posible ("huevos" en vez de "Huevo").
