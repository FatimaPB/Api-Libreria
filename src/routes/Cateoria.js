const express = require("express");
const Categoria = require("../models/Categoria");
const multer = require("multer");
const cloudinary = require('../config/cloudinaryConfig');
const router = express.Router();

// Multer almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Subida a Cloudinary
const uploadToCloudinary = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
};

// 🔹 Crear categoría
router.post("/categorias", upload.fields([{ name: 'imagen' }]), async (req, res) => {
  const { nombre_categoria } = req.body;

  if (!nombre_categoria) {
    return res.status(400).json({ message: "El nombre de la categoría es obligatorio." });
  }

  try {
    const imagen_url = req.files?.imagen
      ? await uploadToCloudinary(req.files.imagen[0].buffer, 'categorias')
      : '';

    const result = await Categoria.crear(nombre_categoria, imagen_url);
    res.status(201).json({ message: "Categoría creada exitosamente", id: result.insertId });

  } catch (err) {
    console.error("Error al crear categoría:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener todas las categorías
router.get("/categorias", async (req, res) => {
  try {
    const categorias = await Categoria.obtenerTodas();
    res.json(categorias);
  } catch (err) {
    console.error("Error al obtener categorías:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Obtener categoría por ID
router.get("/categorias/:id", async (req, res) => {
  try {
    const categoria = await Categoria.obtenerPorId(req.params.id);
    if (!categoria) {
      return res.status(404).json({ message: "Categoría no encontrada." });
    }
    res.json(categoria);
  } catch (err) {
    console.error("Error al obtener categoría:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Actualizar categoría
router.put("/categorias/:id", upload.fields([{ name: 'imagen' }]), async (req, res) => {
  const { nombre_categoria } = req.body;
  const { id } = req.params;

  if (!nombre_categoria) {
    return res.status(400).json({ message: "El nombre de la categoría es obligatorio." });
  }

  try {
    let imagen_url;

    if (req.files?.imagen) {
      imagen_url = await uploadToCloudinary(req.files.imagen[0].buffer, 'categorias');
    } else {
      const categoriaActual = await Categoria.obtenerPorId(id);
      if (!categoriaActual) {
        return res.status(404).json({ message: "Categoría no encontrada." });
      }
      imagen_url = categoriaActual.imagen_url || '';
    }

    const result = await Categoria.actualizar(id, nombre_categoria, imagen_url);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoría no encontrada." });
    }

    res.json({ message: "Categoría actualizada exitosamente" });
  } catch (err) {
    console.error("Error al actualizar categoría:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// 🔹 Eliminar categoría
router.delete("/categorias/:id", async (req, res) => {
  try {
    const result = await Categoria.eliminar(req.params.id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Categoría no encontrada." });
    }
    res.json({ message: "Categoría eliminada exitosamente." });
  } catch (err) {
    console.error("Error al eliminar categoría:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
const respuestasPredefinidas = {
    // Saludos y despedidas
    "hola": "¡Hola! ¿En qué puedo ayudarte?",
    "buenos dias": "¡Buenos días! ¿En qué puedo asistirte?",
    "buenas tardes": "¡Buenas tardes! ¿Cómo puedo ayudarte?",
    "buenas noches": "¡Buenas noches! ¿Necesitas información?",
    "adios": "¡Hasta luego! Que tengas un buen día.",
    "gracias": "¡De nada! Estoy aquí para ayudarte.",
    "muchas gracias": "¡Con gusto! Si tienes más dudas, dime.",

    // Productos
    "tienen biblias": "Sí, tenemos varias versiones de biblias disponibles en la tienda.",
    "que tipos de biblias venden": "Contamos con biblias católicas, de estudio, de bolsillo, juveniles y más.",
    "tienen biblias en letra grande": "Sí, ofrecemos biblias con letra grande para facilitar la lectura.",
    "venden biblias en otros idiomas": "Sí, tenemos biblias en español, inglés y algunos otros idiomas.",
    "tienen biblias para niños": "Sí, contamos con biblias ilustradas y adaptadas para niños.",
    "venden rosarios": "Sí, tenemos rosarios de diferentes materiales y colores.",
    "tienen imagenes religiosas": "Sí, ofrecemos imágenes de santos, vírgenes y otras representaciones religiosas.",
    "venden crucifijos": "Sí, tenemos crucifijos de pared, de mesa y colgantes.",
    "tienen libros de catequesis": "Sí, contamos con material de catequesis para niños, jóvenes y adultos.",
    "venden velas religiosas": "Sí, tenemos velas para oraciones y celebraciones religiosas.",

    // Métodos de pago
    "cuales son los métodos de pago": "Aceptamos pagos con tarjeta, transferencia y efectivo en tienda.",
    "puedo pagar en efectivo al recibir mi pedido": "No, por el momento solo aceptamos pagos antes del envío.",
    "aceptan pagos con paypal": "Actualmente no aceptamos PayPal, pero puedes pagar con tarjeta o transferencia.",

    // Envíos
    "hacen envios": "Sí, realizamos envíos a todo el país.",
    "cuanto cuesta el envio": "El costo varía según la ubicación y el peso del paquete. Puedes calcularlo en el checkout.",
    "cuanto tarda en llegar mi pedido": "El tiempo de entrega depende de tu ubicación, pero suele ser entre 3 y 5 días hábiles.",
    "puedo rastrear mi pedido": "Sí, recibirás un número de seguimiento cuando enviemos tu pedido.",
    "puedo recoger mi pedido en la tienda": "Sí, puedes seleccionar la opción de recogida en tienda al hacer tu compra.",

    // Soporte y contacto
    "cual es el horario de atencion": "Atendemos de lunes a viernes de 9:00 a 18:00 y sábados de 9:00 a 14:00.",
    "como puedo contactar con ustedes": "Puedes escribirnos por WhatsApp, correo o llamarnos directamente.",
    "tienen tienda fisica": "Sí, estamos ubicados en la Librería Diocesana Cristo Rey.",
    "donde estan ubicados": "Nos encontramos en [dirección de la librería].",

    // Devoluciones y cambios
    "puedo devolver un producto": "Sí, aceptamos devoluciones dentro de los 7 días posteriores a la compra, siempre que el producto esté en perfectas condiciones.",
    "que hago si mi pedido llego dañado": "Contáctanos inmediatamente con fotos del daño y te ayudaremos a solucionarlo.",
    "puedo cambiar un producto": "Sí, puedes cambiarlo dentro de los primeros 7 días presentando tu recibo.",

    // Otros
    "tienen descuentos o promociones": "Sí, ocasionalmente tenemos descuentos y promociones. Síguenos en redes sociales para enterarte.",
    "puedo comprar al por mayor": "Sí, ofrecemos descuentos para compras en grandes cantidades. Contáctanos para más detalles.",
    "tienen tarjetas de regalo": "Sí, contamos con tarjetas de regalo en diferentes montos.",
    "hacen pedidos especiales": "Sí, podemos conseguir productos bajo pedido. Escríbenos para más información.",
    "¿Tienen biblias?": "Sí, tenemos varias versiones de biblias disponibles en la tienda.",
    "¿Qué tipos de biblias venden?": "Contamos con biblias católicas, de estudio, de bolsillo, juveniles y más.",
    "¿Tienen biblias en letra grande?": "Sí, ofrecemos biblias con letra grande para facilitar la lectura.",
    "¿Venden biblias en otros idiomas?": "Sí, tenemos biblias en español, inglés y algunos otros idiomas.",
    "¿Tienen biblias para niños?": "Sí, contamos con biblias ilustradas y adaptadas para niños.",
    "¿Venden rosarios?": "Sí, tenemos rosarios de diferentes materiales y colores.",
    "¿Tienen imágenes religiosas?": "Sí, ofrecemos imágenes de santos, vírgenes y otras representaciones religiosas.",
    "¿Venden crucifijos?": "Sí, tenemos crucifijos de pared, de mesa y colgantes.",
    "¿Tienen libros de catequesis?": "Sí, contamos con material de catequesis para niños, jóvenes y adultos.",
    "¿Venden velas religiosas?": "Sí, tenemos velas para oraciones y celebraciones religiosas.",

    // Métodos de pago
    "¿Cuáles son los métodos de pago?": "Aceptamos pagos con tarjeta, transferencia y efectivo en tienda.",
    "¿Puedo pagar en efectivo al recibir mi pedido?": "No, por el momento solo aceptamos pagos antes del envío.",
    "¿Aceptan pagos con PayPal?": "Actualmente no aceptamos PayPal, pero puedes pagar con tarjeta o transferencia.",

    // Envíos
    "¿Hacen envíos?": "Sí, realizamos envíos a todo el país.",
    "¿Cuánto cuesta el envío?": "El costo varía según la ubicación y el peso del paquete. Puedes calcularlo en el checkout.",
    "¿Cuánto tarda en llegar mi pedido?": "El tiempo de entrega depende de tu ubicación, pero suele ser entre 3 y 5 días hábiles.",
    "¿Puedo rastrear mi pedido?": "Sí, recibirás un número de seguimiento cuando enviemos tu pedido.",
    "¿Puedo recoger mi pedido en la tienda?": "Sí, puedes seleccionar la opción de recogida en tienda al hacer tu compra.",

    // Soporte y contacto
    "¿Cuál es el horario de atención?": "Atendemos de lunes a viernes de 9:00 a 18:00 y sábados de 9:00 a 14:00.",
    "¿Cómo puedo contactar con ustedes?": "Puedes escribirnos por WhatsApp, correo o llamarnos directamente.",
    "¿Tienen tienda física?": "Sí, estamos ubicados en la Librería Diocesana Cristo Rey.",
    "¿Dónde están ubicados?": "Nos encontramos en [dirección de la librería].",

    // Devoluciones y cambios
    "¿Puedo devolver un producto?": "Sí, aceptamos devoluciones dentro de los 7 días posteriores a la compra, siempre que el producto esté en perfectas condiciones.",
    "¿Qué hago si mi pedido llegó dañado?": "Contáctanos inmediatamente con fotos del daño y te ayudaremos a solucionarlo.",
    "¿Puedo cambiar un producto?": "Sí, puedes cambiarlo dentro de los primeros 7 días presentando tu recibo.",

    // Otros
    "¿Tienen descuentos o promociones?": "Sí, ocasionalmente tenemos descuentos y promociones. Síguenos en redes sociales para enterarte.",
    "¿Puedo comprar al por mayor?": "Sí, ofrecemos descuentos para compras en grandes cantidades. Contáctanos para más detalles.",
    "¿Tienen tarjetas de regalo?": "Sí, contamos con tarjetas de regalo en diferentes montos.",
    "¿Hacen pedidos especiales?": "Sí, podemos conseguir productos bajo pedido. Escríbenos para más información.",
    "Tienen biblias?": "Sí, tenemos varias versiones de biblias disponibles en la tienda.",
    "¿Qué tipos de biblias venden?": "Contamos con biblias católicas, de estudio, de bolsillo, juveniles y más.",
    "¿Tienen biblias en letra grande?": "Sí, ofrecemos biblias con letra grande para facilitar la lectura.",
    "¿Venden biblias en otros idiomas?": "Sí, tenemos biblias en español, inglés y algunos otros idiomas.",
    "¿Tienen biblias para niños?": "Sí, contamos con biblias ilustradas y adaptadas para niños.",
    "¿Venden rosarios?": "Sí, tenemos rosarios de diferentes materiales y colores.",
    "¿Tienen imágenes religiosas?": "Sí, ofrecemos imágenes de santos, vírgenes y otras representaciones religiosas.",
    "¿Venden crucifijos?": "Sí, tenemos crucifijos de pared, de mesa y colgantes.",
    "¿Tienen libros de catequesis?": "Sí, contamos con material de catequesis para niños, jóvenes y adultos.",
    "¿Venden velas religiosas?": "Sí, tenemos velas para oraciones y celebraciones religiosas.",

    // Métodos de pago
    "¿Cuáles son los métodos de pago?": "Aceptamos pagos con tarjeta, transferencia y efectivo en tienda.",
    "¿Puedo pagar en efectivo al recibir mi pedido?": "No, por el momento solo aceptamos pagos antes del envío.",
    "¿Aceptan pagos con PayPal?": "Actualmente no aceptamos PayPal, pero puedes pagar con tarjeta o transferencia.",

    // Envíos
    "Hacen envíos?": "Sí, realizamos envíos a todo el país.",
    "Cuánto cuesta el envío?": "El costo varía según la ubicación y el peso del paquete. Puedes calcularlo en el checkout.",
    "Cuánto tarda en llegar mi pedido?": "El tiempo de entrega depende de tu ubicación, pero suele ser entre 3 y 5 días hábiles.",
    "Puedo rastrear mi pedido?": "Sí, recibirás un número de seguimiento cuando enviemos tu pedido.",
    "Puedo recoger mi pedido en la tienda?": "Sí, puedes seleccionar la opción de recogida en tienda al hacer tu compra.",

    // Soporte y contacto
    "Cuál es el horario de atención?": "Atendemos de lunes a viernes de 9:00 a 18:00 y sábados de 9:00 a 14:00.",
    "Cómo puedo contactar con ustedes?": "Puedes escribirnos por WhatsApp, correo o llamarnos directamente.",
    "Tienen tienda física?": "Sí, estamos ubicados en la Librería Diocesana Cristo Rey.",
    "Dónde están ubicados?": "Nos encontramos en [dirección de la librería].",

    // Devoluciones y cambios
    "Puedo devolver un producto?": "Sí, aceptamos devoluciones dentro de los 7 días posteriores a la compra, siempre que el producto esté en perfectas condiciones.",
    "Qué hago si mi pedido llegó dañado?": "Contáctanos inmediatamente con fotos del daño y te ayudaremos a solucionarlo.",
    "Puedo cambiar un producto?": "Sí, puedes cambiarlo dentro de los primeros 7 días presentando tu recibo.",

    // Otros
    "Tienen descuentos o promociones?": "Sí, ocasionalmente tenemos descuentos y promociones. Síguenos en redes sociales para enterarte.",
    "Puedo comprar al por mayor?": "Sí, ofrecemos descuentos para compras en grandes cantidades. Contáctanos para más detalles.",
    "Tienen tarjetas de regalo?": "Sí, contamos con tarjetas de regalo en diferentes montos.",
    "Hacen pedidos especiales?": "Sí, podemos conseguir productos bajo pedido. Escríbenos para más información."


};

// Respuesta por defecto si no entiende la pregunta
const respuestaPorDefecto = "No entiendo.";


// Ruta para manejar el chat
router.post('/chat', (req, res) => {
    const { pregunta } = req.body;
    const respuesta = respuestasPredefinidas[pregunta] || "No entiendo.";
    res.json({ respuesta });
});

module.exports = router;
