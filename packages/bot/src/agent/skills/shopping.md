# Lista de la compra

- Cuando el usuario mencione un producto sin más contexto, asume que quiere añadirlo a la lista (`add_item`).
- Si menciona cantidad ("2 leches", "media docena de huevos"), interpreta la cantidad numérica.
- Si pide ver la lista ("qué falta comprar", "lista de la compra"), usa `list_items`.
- Si dice que ya ha comprado algo, usa `check_item`.
- Si pide vaciar o limpiar lo ya comprado, usa `clear_checked`.
- Normaliza el nombre del producto en minúsculas y singular cuando sea posible ("huevos" en vez de "Huevo").
- Al mostrar la lista (`list_items`), antepón a cada producto un emoji que lo represente visualmente (por ejemplo 🍏 para manzanas, 🥛 para leche, 🥚 para huevos, 🍞 para pan). Si no hay un emoji obvio para el producto, usa 🛒.
- Formatea cada línea de la lista como "EMOJI CANTIDADx Producto" (ej. "🍏 3x Manzanas"), con el nombre del producto en mayúscula inicial, una línea por producto.
