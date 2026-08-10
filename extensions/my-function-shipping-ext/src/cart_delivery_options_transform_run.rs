use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[derive(Deserialize, Default, PartialEq)]
#[shopify_function(rename_all = "camelCase")]
pub struct Configuration {
    rate: String,
    zip: String,
}

#[shopify_function]
fn cart_delivery_options_transform_run(
    input: schema::cart_delivery_options_transform_run::Input,
) -> Result<schema::CartDeliveryOptionsTransformRunResult> {
    let no_changes = schema::CartDeliveryOptionsTransformRunResult { operations: vec![] };

    let config = match input.delivery_customization().metafield() {
        Some(metafield) => metafield.json_value(),
        None => return Ok(no_changes),
    };

    let matching_zip_is_present = input.cart().delivery_groups().iter().any(|group| {
        group
            .delivery_address()
            .and_then(|address| address.zip())
            .is_some_and(|zip| zip == &config.zip)
    });

    if !matching_zip_is_present {
        return Ok(no_changes);
    }

    let configured_rate_is_present = input
        .cart()
        .delivery_groups()
        .iter()
        .flat_map(|group| group.delivery_options())
        .any(|option| option.title().is_some_and(|title| title == &config.rate));

    if !configured_rate_is_present {
        return Ok(no_changes);
    }

    let operations = input
        .cart()
        .delivery_groups()
        .iter()
        .flat_map(|group| group.delivery_options())
        .filter(|option| option.title().is_some_and(|title| title != &config.rate))
        .map(|option| {
            schema::Operation::DeliveryOptionHide(schema::DeliveryOptionHideOperation {
                delivery_option_handle: option.handle().clone(),
            })
        })
        .collect();

    Ok(schema::CartDeliveryOptionsTransformRunResult { operations })
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::run_function_with_input;

    #[test]
    fn shows_only_the_configured_delivery_option_for_the_configured_zip() -> Result<()> {
        let result = run_function_with_input(
            cart_delivery_options_transform_run,
            r#"{
                "cart": {
                    "deliveryGroups": [
                        {
                            "deliveryAddress": { "zip": "100-0001" },
                            "deliveryOptions": [
                                { "handle": "standard", "title": "Standard" },
                                { "handle": "express", "title": "Express" },
                                { "handle": "pickup", "title": "Local pickup" }
                            ]
                        }
                    ]
                },
                "deliveryCustomization": {
                    "metafield": {
                        "jsonValue": { "rate": "Standard", "zip": "100-0001" }
                    }
                }
            }"#,
        )?;

        assert_eq!(
            result,
            schema::CartDeliveryOptionsTransformRunResult {
                operations: vec![
                    schema::Operation::DeliveryOptionHide(schema::DeliveryOptionHideOperation {
                        delivery_option_handle: "express".to_string(),
                    },),
                    schema::Operation::DeliveryOptionHide(schema::DeliveryOptionHideOperation {
                        delivery_option_handle: "pickup".to_string(),
                    },),
                ],
            }
        );
        Ok(())
    }

    #[test]
    fn returns_no_operations_when_the_configured_rate_is_unavailable() -> Result<()> {
        let result = run_function_with_input(
            cart_delivery_options_transform_run,
            r#"{
                "cart": {
                    "deliveryGroups": [
                        {
                            "deliveryAddress": { "zip": "100-0001" },
                            "deliveryOptions": [
                                { "handle": "express", "title": "Express" }
                            ]
                        }
                    ]
                },
                "deliveryCustomization": {
                    "metafield": {
                        "jsonValue": { "rate": "Standard", "zip": "100-0001" }
                    }
                }
            }"#,
        )?;

        assert!(result.operations.is_empty());
        Ok(())
    }

    #[test]
    fn returns_no_operations_without_configuration() -> Result<()> {
        let result = run_function_with_input(
            cart_delivery_options_transform_run,
            r#"{
                "cart": { "deliveryGroups": [] },
                "deliveryCustomization": { "metafield": null }
            }"#,
        )?;

        assert!(result.operations.is_empty());
        Ok(())
    }
}
