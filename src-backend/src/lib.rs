use actix_web::{get, middleware, post, web, App, HttpResponse, HttpServer, Responder};

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Helloss")
}

#[post("/echo")]
async fn echo(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

async fn manual_hello() -> impl Responder {
    HttpResponse::Ok().body("Hey there!")
}

#[actix_web::main]
pub async fn server() -> Result<(), std::io::Error> {
    let server = HttpServer::new(|| {
        App::new()
            .wrap(middleware::DefaultHeaders::new().add(("Access-Control-Allow-Origin", "*")))
            .service(hello)
            .service(echo)
            .route("/hey", web::get().to(manual_hello))
    })
    .bind(("::", 8888))?
    .run();
    server.await
}
