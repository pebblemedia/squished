<?php
/**
 * Field renderers for Settings → Squished.
 *
 * @package Squished
 */

defined( 'ABSPATH' ) || exit;

/**
 * One static method per settings field.
 */
class Squished_Settings_Fields {

	/**
	 * Field name attribute for a key.
	 *
	 * @param string $key Setting key.
	 * @return string
	 */
	private static function name( $key ) {
		return Squished_Settings::OPTION . '[' . $key . ']';
	}

	/**
	 * Checkbox with a label.
	 *
	 * @param string $key   Setting key.
	 * @param string $label Label text.
	 */
	private static function checkbox( $key, $label ) {
		$s = Squished_Settings::get();
		printf(
			'<label><input type="checkbox" id="%1$s" name="%2$s" value="1" %3$s /> %4$s</label>',
			esc_attr( 'squished_' . $key ),
			esc_attr( self::name( $key ) ),
			checked( ! empty( $s[ $key ] ), true, false ),
			esc_html( $label )
		);
	}

	/**
	 * Help text below a field.
	 *
	 * @param string $text Text.
	 */
	private static function help( $text ) {
		echo '<p class="description">' . esc_html( $text ) . '</p>';
	}

	/** Enable/disable. */
	public static function enabled() {
		self::checkbox( 'enabled', __( 'Compress JPEG, PNG and WebP images in the browser before upload', 'squished' ) );
		self::help( __( 'GIF, SVG and other files upload as they are. If compression fails or does not make a file smaller, the original uploads untouched.', 'squished' ) );
	}

	/** Max longest side. */
	public static function max_side() {
		$s = Squished_Settings::get();
		printf(
			'<input type="number" class="small-text" id="squished_max_side" name="%1$s" value="%2$d" min="0" max="16384" step="1" /> %3$s',
			esc_attr( self::name( 'max_side' ) ),
			absint( $s['max_side'] ),
			esc_html__( 'pixels', 'squished' )
		);
		self::help( __( 'Larger images are scaled down to fit. 0 keeps the original dimensions. 2560 matches WordPress’s own big-image threshold.', 'squished' ) );
	}

	/** Output format. */
	public static function format() {
		$s       = Squished_Settings::get();
		$options = array(
			'keep' => __( 'Keep the original format', 'squished' ),
			'webp' => __( 'Convert to WebP', 'squished' ),
			'avif' => __( 'Convert to AVIF (only if the browser can encode it)', 'squished' ),
		);
		echo '<fieldset id="squished_format"><legend class="screen-reader-text">' . esc_html__( 'Format', 'squished' ) . '</legend>';
		foreach ( $options as $value => $label ) {
			$support  = 'keep' === $value ? array(
				'allowed'    => true,
				'thumbnails' => true,
			) : Squished_Settings::server_support( 'image/' . $value );
			$disabled = ! $support['allowed'] || ! $support['thumbnails'];
			printf(
				'<label><input type="radio" name="%1$s" value="%2$s" %3$s %4$s /> %5$s</label>',
				esc_attr( self::name( 'format' ) ),
				esc_attr( $value ),
				checked( $s['format'], $value, false ),
				disabled( $disabled, true, false ),
				esc_html( $label )
			);
			if ( ! $support['allowed'] ) {
				echo ' <em>' . esc_html__( '(this WordPress version does not accept these uploads)', 'squished' ) . '</em>';
			} elseif ( ! $support['thumbnails'] ) {
				echo ' <em>' . esc_html__( '(unavailable: your server cannot make thumbnails of this format)', 'squished' ) . '</em>';
			}
			echo '<br />';
		}
		echo '</fieldset>';
		self::help( __( 'If the browser cannot encode the chosen format, the image is compressed in its original format instead.', 'squished' ) );
	}

	/** Quality. */
	public static function quality() {
		$s = Squished_Settings::get();
		printf(
			'<input type="number" class="small-text" id="squished_quality" name="%1$s" value="%2$d" min="1" max="100" step="1" />',
			esc_attr( self::name( 'quality' ) ),
			absint( $s['quality'] )
		);
		self::help( __( '1–100. 80 looks the same as the original for most photos. PNGs kept as PNG stay lossless and ignore this.', 'squished' ) );
	}

	/** Keep GPS vs. strip everything. */
	public static function keep_gps() {
		self::checkbox( 'keep_gps', __( 'Keep GPS location (good for local SEO)', 'squished' ) );
		self::help( __( 'Camera details, serial numbers and other metadata are always removed. Unchecked, all metadata including location is removed. GPS is kept only in JPEG output; WebP and AVIF output never carry location.', 'squished' ) );
	}

	/** SEO file names. */
	public static function seo_names() {
		self::checkbox( 'seo_names', __( 'Rename compressed images to lowercase-dash slugs', 'squished' ) );
		self::help( __( 'For example, “IMG 2041 Front Door (1).JPG” uploads as “img-2041-front-door-1.jpg”.', 'squished' ) );
	}
}
