<?php
/**
 * Plugin Name:       Squished
 * Plugin URI:        https://squished.app/
 * Description:       Compresses images in your browser before they upload. No third-party server, no API key, no quota, no server CPU.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Squished
 * Author URI:        https://squished.app/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       squished
 *
 * @package Squished
 */

defined( 'ABSPATH' ) || exit;

define( 'SQUISHED_VERSION', '0.1.0' );
define( 'SQUISHED_FILE', __FILE__ );
define( 'SQUISHED_URL', plugin_dir_url( __FILE__ ) );

require_once __DIR__ . '/includes/class-squished-settings.php';
require_once __DIR__ . '/includes/class-squished-assets.php';

Squished_Settings::init();
Squished_Assets::init();
